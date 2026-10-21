import { useMemo } from 'react';
import { encodeQr } from '../../lib/qr';
import { Empty } from '../common';

export function QrCode({ url }: { url: string }) {
  const qr = useMemo(() => encodeQr(url, { ecc: 'M' }), [url]);
  if (!qr) return <Empty>This link is too long to encode.</Empty>;
  const quiet = 2,
    dimension = qr.size + quiet * 2,
    path: string[] = [];
  for (let y = 0; y < qr.size; y++)
    for (let x = 0; x < qr.size; x++)
      if (qr.modules[y][x]) path.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
  return (
    <svg
      viewBox={`0 0 ${dimension} ${dimension}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code for this session's share link"
    >
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path.join('')} fill="#0a0a0a" />
    </svg>
  );
}
