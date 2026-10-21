import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createSessionStore } from './state/sessionStore';
import { createRpcClient } from './services/supabase';
beforeEach(() => localStorage.clear());
it('supports registration, pause/reactivate, doubles generation, substitution and scoring through the UI', async () => {
  const store = createSessionStore(localStorage);
  const user = userEvent.setup();
  render(<App store={store} />);
  for (const name of ['Alice', 'Bea', 'Cara', 'Dana', 'Eli']) {
    await user.type(screen.getByLabelText('Player Name'), name);
    await user.click(screen.getByRole('button', { name: 'Add to Roster' }));
  }
  const roster = screen.getByRole('region', { name: 'Player Roster' });
  const alice = within(roster).getByText('Alice').closest('li')!;
  await user.click(within(alice).getByRole('button', { name: 'Time Out Player' }));
  expect(within(alice).getByText('Timed Out')).toBeVisible();
  await user.click(within(alice).getByRole('button', { name: 'Activate Player' }));
  await user.click(screen.getByRole('button', { name: 'Generate Next Round' }));
  const courts = screen.getByRole('region', { name: 'Live Courts' });
  expect(within(courts).getAllByRole('button', { name: 'Change Player' })).toHaveLength(4);
  const row = within(courts)
    .getAllByRole('button', { name: 'Change Player' })[0]
    .closest<HTMLElement>('.assigned-player-row')!;
  await user.click(within(row).getByRole('button', { name: 'Change Player' }));
  const picker = within(row).getByRole('combobox');
  await user.selectOptions(
    picker,
    (picker.querySelectorAll('option')[1] as HTMLOptionElement).value,
  );
  await user.click(within(row).getByRole('button', { name: 'Apply Change' }));
  await user.click(within(courts).getByRole('button', { name: 'Declare Team A Winner' }));
  expect(store.getState().session.matchLog).toHaveLength(1);
  expect(store.getState().session.players.reduce((sum, p) => sum + p.wins, 0)).toBe(2);
});
it('loads a v1 shared link read-only without changing organizer storage', async () => {
  const before = localStorage.length;
  const rpc = createRpcClient(
    async () =>
      new Response(
        JSON.stringify([
          {
            payload: { players: [{ id: 'v', name: 'Viewer Player', wins: 2 }] },
            updated_at: '2026-10-18T00:00:00Z',
          },
        ]),
      ),
  );
  render(<App sharedCode="printed-v1" rpc={rpc} />);
  expect(
    await within(screen.getByRole('region', { name: 'Leaderboard' })).findByText('Viewer Player'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Generate Next Round' })).not.toBeInTheDocument();
  expect(localStorage.length).toBe(before);
});
it('refuses a stale replacement submission after the generated-at deadline', async () => {
  vi.useFakeTimers();
  const store = createSessionStore(localStorage);
  for (const n of ['a', 'b', 'c', 'd', 'e'])
    store.getState().act((e) => e.addPlayer(n, 'intermediate'));
  render(<App store={store} />);
  fireEvent.click(screen.getByRole('button', { name: 'Generate Next Round' }));
  const button = screen.getAllByRole('button', { name: 'Change Player' })[0];
  expect(button).toBeEnabled();
  act(() => vi.advanceTimersByTime(120000));
  expect(button).toBeDisabled();
  expect(screen.getAllByRole('button', { name: 'Injury Substitute' })[0]).toBeEnabled();
  vi.useRealTimers();
});
