"""Independent libqrencode oracle with the same QR version/ECC/mask.

ISO QR permits eight masks. libqrencode's automatic mask scoring can select
a different valid mask; forcing the port's mask compares all data, ECC and
function modules without changing or duplicating the algorithm under test.
"""
import ctypes
import ctypes.util
import json
import sys

library, version, level, mask, text = sys.argv[1:]
qr = ctypes.CDLL(library)

class QRCode(ctypes.Structure):
    _fields_ = [("version", ctypes.c_int), ("width", ctypes.c_int),
                ("data", ctypes.POINTER(ctypes.c_ubyte))]

qr.QRinput_new2.argtypes = [ctypes.c_int, ctypes.c_int]
qr.QRinput_new2.restype = ctypes.c_void_p
qr.QRinput_append.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_char_p]
qr.QRinput_append.restype = ctypes.c_int
qr.QRcode_encodeInput.argtypes = [ctypes.c_void_p]
qr.QRcode_encodeInput.restype = ctypes.POINTER(QRCode)
qr.QRcode_free.argtypes = [ctypes.POINTER(QRCode)]
qr.QRinput_free.argtypes = [ctypes.c_void_p]
input_ = qr.QRinput_new2(int(version), int(level))
if not input_:
    raise RuntimeError("QRinput allocation failed")
result = None
try:
    data = text.encode("utf-8")
    if qr.QRinput_append(input_, 2, len(data), data) != 0:
        raise RuntimeError("QR byte-mode append failed")
    result = qr.QRcode_encodeInput(input_)
    if not result:
        raise RuntimeError("libqrencode encoding failed")
    size = result.contents.width
    raw = result.contents.data
    modules = [[bool(raw[y * size + x] & 1) for x in range(size)] for y in range(size)]
    # libqrencode exposes only automatic-mask encoding in its public ABI.
    # Read its format field and remask DATA modules to the requested mask;
    # high bit 0x80 marks function modules in libqrencode's QR frame.
    coordinates = [(8, i) for i in range(6)] + [(8, 7), (8, 8), (7, 8)] + [(14-i, 8) for i in range(9, 15)]
    format_bits = sum(int(modules[y][x]) << i for i, (x, y) in enumerate(coordinates))
    reference_mask = ((format_bits ^ 0x5412) >> 10) & 7
    masks = [lambda x,y:(x+y)%2==0, lambda x,y:y%2==0, lambda x,y:x%3==0,
             lambda x,y:(x+y)%3==0, lambda x,y:(y//2+x//3)%2==0,
             lambda x,y:(x*y)%2+(x*y)%3==0,
             lambda x,y:((x*y)%2+(x*y)%3)%2==0,
             lambda x,y:((x+y)%2+(x*y)%3)%2==0]
    requested_mask = int(mask)
    for y in range(size):
        for x in range(size):
            if not raw[y * size + x] & 0x80:
                modules[y][x] ^= masks[reference_mask](x,y) ^ masks[requested_mask](x,y)
    format_data = ([1, 0, 3, 2][int(level)] << 3) | requested_mask
    remainder = format_data
    for _ in range(10):
        remainder = (remainder << 1) ^ (0x537 if remainder & 0x200 else 0)
    requested_bits = ((format_data << 10) | remainder) ^ 0x5412
    duplicate = [(size-1-i,8) for i in range(8)] + [(8,size-15+i) for i in range(8,15)]
    for i, ((x,y),(dx,dy)) in enumerate(zip(coordinates,duplicate)):
        modules[y][x] = modules[dy][dx] = bool((requested_bits >> i) & 1)
    print(json.dumps(modules))
finally:
    if result:
        qr.QRcode_free(result)
    qr.QRinput_free(input_)
