import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildHistoryCsv, buildBackupJson } from './exports';
import { PrintReport } from '../features/reports/PrintReport';
import { migrate } from '../domain/migrate';
it('quotes names and exports a share-safe versioned backup', () => {
  const state = migrate({
    players: [],
    matchLog: [
      {
        id: 'm',
        round: 1,
        court: 1,
        matchType: 'Doubles',
        winners: ['A, "B"'],
        losers: ['C'],
        finishedAt: '2026-10-18T00:00:00Z',
      },
    ],
  });
  expect(buildHistoryCsv(state)).toContain('"A, ""B"""');
  expect(JSON.parse(buildBackupJson(state)).schemaVersion).toBe(2);
});
it('renders both printable sections and empty-state explanations', () => {
  render(<PrintReport state={migrate(null)} />);
  expect(screen.getByText('Final Standings')).toBeInTheDocument();
  expect(screen.getByText('Match Results')).toBeInTheDocument();
  expect(screen.getByText('No players on the roster.')).toBeInTheDocument();
});
