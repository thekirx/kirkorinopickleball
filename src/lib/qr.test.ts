// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { it, expect } from 'vitest';
import { encodeQr } from './qr';
const html = execFileSync('git', ['show', '8b39e95:index.html'], { encoding: 'utf8' });
const source = html.slice(
  html.indexOf('const QR = (() => {'),
  html.indexOf(
    '    /* =========================================================\n       APPLICATION STATE',
  ),
);
const baseline = runInNewContext(`${source}; QR`, { TextEncoder });
const cases = Array.from({ length: 41 }, (_, i) => ({
  text: i === 40 ? 'https://kirq.vercel.app/?s=legacy-code' : 'kirq-phase-one',
  version: i === 40 ? 1 : i + 1,
  ecc: (['L', 'M', 'Q', 'H'] as const)[i % 4],
}));
it.each(cases)(
  'preserves baseline QR modules (v$version/$ecc)',
  ({ text, version, ecc }) => {
    const expected = baseline.encode(text, { minVersion: version, ecc }),
      actual = encodeQr(text, { minVersion: version, ecc });
    expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
  },
  30000,
);
const library = [
  '/opt/homebrew/lib/libqrencode.dylib',
  '/usr/local/lib/libqrencode.dylib',
  '/usr/lib/x86_64-linux-gnu/libqrencode.so.4',
].find(existsSync);
it.skipIf(!library).each(cases)(
  'matches independent libqrencode modules with the same mask (v$version/$ecc)',
  ({ text, version, ecc }) => {
    const actual = encodeQr(text, { ecc, minVersion: version })!;
    const reference = execFileSync(
      'python3',
      [
        fileURLToPath(new URL('../test/qr-reference.py', import.meta.url)),
        library!,
        String(version),
        String(['L', 'M', 'Q', 'H'].indexOf(ecc)),
        String(actual.mask),
        text,
      ],
      { encoding: 'utf8' },
    );
    expect(actual.modules).toEqual(JSON.parse(reference));
  },
  30000,
);
