// @ts-nocheck -- algorithm ported verbatim from 8b39e95; covered by module-grid parity tests.
const QR = (() => {
  const ECC = { L: 0, M: 1, Q: 2, H: 3 };
  const ECC_FORMAT_BITS = { 0: 1, 1: 0, 2: 3, 3: 2 };

  const ECC_CODEWORDS_PER_BLOCK = [
    [
      -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30,
      30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
    [
      -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28,
      28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    ],
    [
      -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30,
      30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
    [
      -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24,
      30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
  ];

  const NUM_ECC_BLOCKS = [
    [
      -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13,
      14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
    ],
    [
      -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23,
      25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
    ],
    [
      -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29,
      34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
    ],
    [
      -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35,
      37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
    ],
  ];

  /* ---------- GF(256) arithmetic ---------- */
  function gfMultiply(a, b) {
    let result = 0;
    for (let i = 7; i >= 0; i -= 1) {
      result = (result << 1) ^ ((result >>> 7) * 0x11d);
      result ^= ((b >>> i) & 1) * a;
    }
    return result & 0xff;
  }

  function reedSolomonDivisor(degree) {
    const result = new Uint8Array(degree);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i += 1) {
      for (let j = 0; j < degree; j += 1) {
        result[j] = gfMultiply(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMultiply(root, 2);
    }
    return result;
  }

  function reedSolomonRemainder(data, divisor) {
    const result = new Uint8Array(divisor.length);
    for (const byte of data) {
      const factor = byte ^ result[0];
      result.copyWithin(0, 1);
      result[result.length - 1] = 0;
      for (let i = 0; i < divisor.length; i += 1) {
        result[i] ^= gfMultiply(divisor[i], factor);
      }
    }
    return result;
  }

  /* ---------- capacity maths ---------- */
  function rawDataModules(version) {
    let result = (16 * version + 128) * version + 64;
    if (version >= 2) {
      const numAlign = Math.floor(version / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (version >= 7) result -= 36;
    }
    return result;
  }

  function dataCodewords(version, ecl) {
    return (
      Math.floor(rawDataModules(version) / 8) -
      ECC_CODEWORDS_PER_BLOCK[ecl][version] * NUM_ECC_BLOCKS[ecl][version]
    );
  }

  function alignmentPositions(version) {
    if (version === 1) return [];
    const numAlign = Math.floor(version / 7) + 2;
    const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }

  /* ---------- bit stream ---------- */
  function buildCodewords(bytes, version, ecl) {
    const bits = [];
    const push = (value, length) => {
      for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
    };

    push(4, 4); // byte mode
    push(bytes.length, version <= 9 ? 8 : 16);
    for (const byte of bytes) push(byte, 8);

    const capacityBits = dataCodewords(version, ecl) * 8;
    push(0, Math.min(4, capacityBits - bits.length));
    push(0, (8 - (bits.length % 8)) % 8);

    for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) {
      push(pad, 8);
    }

    const result = new Uint8Array(bits.length / 8);
    bits.forEach((bit, index) => {
      result[index >>> 3] |= bit << (7 - (index & 7));
    });
    return result;
  }

  function addErrorCorrection(data, version, ecl) {
    const numBlocks = NUM_ECC_BLOCKS[ecl][version];
    const eccLen = ECC_CODEWORDS_PER_BLOCK[ecl][version];
    const rawCodewords = Math.floor(rawDataModules(version) / 8);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const divisor = reedSolomonDivisor(eccLen);

    const blocks = [];
    for (let i = 0, offset = 0; i < numBlocks; i += 1) {
      const dataLen = shortBlockLen - eccLen + (i < numShortBlocks ? 0 : 1);
      const block = Array.from(data.slice(offset, offset + dataLen));
      offset += dataLen;

      const ecc = Array.from(reedSolomonRemainder(block, divisor));

      // Short blocks carry a placeholder so every block is the same
      // length; the placeholder is skipped again when interleaving.
      if (i < numShortBlocks) block.push(0);
      blocks.push(block.concat(ecc));
    }

    const result = [];
    for (let i = 0; i < blocks[0].length; i += 1) {
      blocks.forEach((block, blockIndex) => {
        if (i !== shortBlockLen - eccLen || blockIndex >= numShortBlocks) {
          result.push(block[i]);
        }
      });
    }
    return result;
  }

  /* ---------- matrix ---------- */
  function createMatrix(version) {
    const size = version * 4 + 17;
    return {
      size,
      modules: Array.from({ length: size }, () => new Array(size).fill(false)),
      reserved: Array.from({ length: size }, () => new Array(size).fill(false)),
    };
  }

  function setFunction(matrix, x, y, isDark) {
    if (x < 0 || y < 0 || x >= matrix.size || y >= matrix.size) return;
    matrix.modules[y][x] = isDark;
    matrix.reserved[y][x] = true;
  }

  function drawFinder(matrix, centerX, centerY) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(matrix, centerX + dx, centerY + dy, distance !== 2 && distance !== 4);
      }
    }
  }

  function drawAlignment(matrix, centerX, centerY) {
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        setFunction(matrix, centerX + dx, centerY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  function drawFunctionPatterns(matrix, version, ecl) {
    const size = matrix.size;

    for (let i = 0; i < size; i += 1) {
      setFunction(matrix, 6, i, i % 2 === 0);
      setFunction(matrix, i, 6, i % 2 === 0);
    }

    drawFinder(matrix, 3, 3);
    drawFinder(matrix, size - 4, 3);
    drawFinder(matrix, 3, size - 4);

    const positions = alignmentPositions(version);
    positions.forEach((y, i) => {
      positions.forEach((x, j) => {
        const isFinderCorner =
          (i === 0 && j === 0) ||
          (i === 0 && j === positions.length - 1) ||
          (i === positions.length - 1 && j === 0);
        if (!isFinderCorner) drawAlignment(matrix, x, y);
      });
    });

    // Reserve format information areas. Index 6 belongs to the timing
    // pattern and is already drawn and reserved, so leave it alone.
    for (let i = 0; i < 9; i += 1) {
      if (i === 6) continue;
      setFunction(matrix, i, 8, false);
      setFunction(matrix, 8, i, false);
    }
    for (let i = 0; i < 8; i += 1) {
      setFunction(matrix, size - 1 - i, 8, false);
      setFunction(matrix, 8, size - 1 - i, false);
    }
    setFunction(matrix, 8, size - 8, true); // dark module

    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      const bits = (version << 12) | rem;
      for (let i = 0; i < 18; i += 1) {
        const bit = ((bits >>> i) & 1) === 1;
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunction(matrix, a, b, bit);
        setFunction(matrix, b, a, bit);
      }
    }
  }

  function drawFormatBits(matrix, ecl, mask) {
    const data = (ECC_FORMAT_BITS[ecl] << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    const size = matrix.size;

    for (let i = 0; i <= 5; i += 1) setFunction(matrix, 8, i, ((bits >>> i) & 1) === 1);
    setFunction(matrix, 8, 7, ((bits >>> 6) & 1) === 1);
    setFunction(matrix, 8, 8, ((bits >>> 7) & 1) === 1);
    setFunction(matrix, 7, 8, ((bits >>> 8) & 1) === 1);
    for (let i = 9; i < 15; i += 1) setFunction(matrix, 14 - i, 8, ((bits >>> i) & 1) === 1);

    for (let i = 0; i < 8; i += 1) {
      setFunction(matrix, size - 1 - i, 8, ((bits >>> i) & 1) === 1);
    }
    for (let i = 8; i < 15; i += 1) {
      setFunction(matrix, 8, size - 15 + i, ((bits >>> i) & 1) === 1);
    }
    setFunction(matrix, 8, size - 8, true);
  }

  function drawCodewords(matrix, codewords) {
    const size = matrix.size;
    let bitIndex = 0;

    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert += 1) {
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (matrix.reserved[y][x]) continue;
          if (bitIndex < codewords.length * 8) {
            matrix.modules[y][x] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
            bitIndex += 1;
          }
        }
      }
    }
  }

  const MASK_FUNCTIONS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];

  function applyMask(matrix, mask) {
    for (let y = 0; y < matrix.size; y += 1) {
      for (let x = 0; x < matrix.size; x += 1) {
        if (!matrix.reserved[y][x] && MASK_FUNCTIONS[mask](x, y)) {
          matrix.modules[y][x] = !matrix.modules[y][x];
        }
      }
    }
  }

  function penaltyScore(matrix) {
    const size = matrix.size;
    const modules = matrix.modules;
    let score = 0;

    const runScore = (runLength) => (runLength >= 5 ? runLength - 2 : 0);

    for (let y = 0; y < size; y += 1) {
      let runColor = modules[y][0];
      let runLength = 1;
      for (let x = 1; x < size; x += 1) {
        if (modules[y][x] === runColor) {
          runLength += 1;
        } else {
          score += runScore(runLength);
          runColor = modules[y][x];
          runLength = 1;
        }
      }
      score += runScore(runLength);
    }

    for (let x = 0; x < size; x += 1) {
      let runColor = modules[0][x];
      let runLength = 1;
      for (let y = 1; y < size; y += 1) {
        if (modules[y][x] === runColor) {
          runLength += 1;
        } else {
          score += runScore(runLength);
          runColor = modules[y][x];
          runLength = 1;
        }
      }
      score += runScore(runLength);
    }

    for (let y = 0; y < size - 1; y += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) {
          score += 3;
        }
      }
    }

    const pattern = [true, false, true, true, true, false, true];
    const hasPattern = (get, index) => {
      for (let i = 0; i < 7; i += 1) if (get(index + i) !== pattern[i]) return false;
      return true;
    };
    const isLight = (get, from, count) => {
      for (let i = 0; i < count; i += 1) {
        const value = get(from + i);
        if (value === null || value === true) return false;
      }
      return true;
    };

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x <= size - 7; x += 1) {
        const get = (i) => (i < 0 || i >= size ? null : modules[y][i]);
        if (hasPattern(get, x) && (isLight(get, x - 4, 4) || isLight(get, x + 7, 4))) {
          score += 40;
        }
      }
    }
    for (let x = 0; x < size; x += 1) {
      for (let y = 0; y <= size - 7; y += 1) {
        const get = (i) => (i < 0 || i >= size ? null : modules[i][x]);
        if (hasPattern(get, y) && (isLight(get, y - 4, 4) || isLight(get, y + 7, 4))) {
          score += 40;
        }
      }
    }

    let dark = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) if (modules[y][x]) dark += 1;
    }
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    score += k * 10;

    return score;
  }

  function encode(text, options = {}) {
    const ecl = ECC[options.ecc || 'M'];
    const bytes = new TextEncoder().encode(text);

    let version = options.minVersion || 1;
    while (version <= 40) {
      const capacityBits = dataCodewords(version, ecl) * 8;
      const countBits = version <= 9 ? 8 : 16;
      if (4 + countBits + bytes.length * 8 <= capacityBits) break;
      version += 1;
    }
    if (version > 40) return null;

    const codewords = addErrorCorrection(buildCodewords(bytes, version, ecl), version, ecl);
    const matrix = createMatrix(version);
    drawFunctionPatterns(matrix, version, ecl);
    drawCodewords(matrix, codewords);

    let bestMask = 0;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask += 1) {
      drawFormatBits(matrix, ecl, mask);
      applyMask(matrix, mask);
      const score = penaltyScore(matrix);
      if (score < bestScore) {
        bestScore = score;
        bestMask = mask;
      }
      applyMask(matrix, mask);
    }

    drawFormatBits(matrix, ecl, bestMask);
    applyMask(matrix, bestMask);

    return { size: matrix.size, version, mask: bestMask, modules: matrix.modules };
  }

  return { encode, dataCodewords, ECC };
})();
export const encodeQr = QR.encode;
