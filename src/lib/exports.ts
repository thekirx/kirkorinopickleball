import type { TournamentStateV2 } from '../domain/types';
import { serializeState } from '../domain/serialize';
export const fileStamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const csv = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`;
export function buildHistoryCsv(state: TournamentStateV2) {
  const rows: unknown[][] = [
    ['Round', 'Court', 'Match Type', 'Winners', 'Losers', 'Finished At'],
    ...state.matchLog.map((e) => [
      e.round,
      e.court,
      e.matchType,
      e.winners.join(' & '),
      e.losers.join(' & '),
      e.finishedAt,
    ]),
  ];
  return rows.map((row) => row.map(csv).join(',')).join('\r\n');
}
export const buildBackupJson = (state: TournamentStateV2) =>
  JSON.stringify(serializeState(state), null, 2);
export function downloadFile(name: string, type: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function printReport() {
  const old = document.title;
  document.title = `KirQ-Session-Report-${fileStamp()}`;
  const restore = () => {
    document.title = old;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
  setTimeout(restore, 3000);
}
