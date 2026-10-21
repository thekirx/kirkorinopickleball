import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import { createSessionStore } from '../../state/sessionStore';
import { createRpcClient } from '../../services/supabase';

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

const NAMES = ['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fin'];
function seeded(names = NAMES) {
  const store = createSessionStore(localStorage);
  for (const n of names) store.getState().act((e) => e.addPlayer(n, 'intermediate'));
  return store;
}
/** Render already in play: courts set to 1 so 4 play and the rest sit out. */
async function inPlay(names = NAMES) {
  const user = userEvent.setup();
  const store = seeded(names);
  render(<App store={store} />);
  await user.click(screen.getByRole('button', { name: 'Next: courts' }));
  await user.click(screen.getByRole('button', { name: 'One fewer court' }));
  await user.click(screen.getByRole('button', { name: 'Start playing' }));
  return { user, store };
}
const court = (n: number) => screen.getByRole('article', { name: `Court ${n}` });

it('guides a first-timer from an empty screen to the first round', async () => {
  const user = userEvent.setup();
  const store = createSessionStore(localStorage);
  render(<App store={store} />);
  expect(screen.getByRole('heading', { name: "Who's here today?" })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next: courts' })).toBeDisabled();
  for (const n of ['Ana', 'Ben', 'Cy', 'Dee', 'Eve']) {
    await user.type(screen.getByLabelText('Player name'), n);
    await user.click(screen.getByRole('button', { name: 'Add' }));
  }
  expect(screen.getByLabelText('Player name')).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Next: courts' }));
  expect(screen.getByText(/4 people play on 1 court/)).toBeInTheDocument();
  expect(screen.getByText(/1 person sits out and goes first next time/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Start playing' }));
  expect(court(1)).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument();
  expect(store.getState().session.currentRound).toBe(1);
});

it('puts sample players in a separate practice session', async () => {
  const user = userEvent.setup();
  const store = createSessionStore(localStorage);
  const realId = store.getState().sessionId;
  render(<App store={store} />);
  await user.click(screen.getByRole('button', { name: /Try it with 10 sample players/ }));
  expect(store.getState().sessionId).not.toBe(realId);
  expect(store.getState().session.players).toHaveLength(10);
  const real = JSON.parse(localStorage.getItem(`kirq-session-${realId}`) ?? '{"players":[]}');
  expect(real.players).toHaveLength(0);
});

it('records, changes and clears a winner from the court card', async () => {
  const { user, store } = await inPlay();
  const [teamA, teamB] = within(court(1)).getAllByRole('button', { name: /Tap if they won/ });
  await user.click(teamA);
  expect(store.getState().session.matchLog).toHaveLength(1);
  expect(within(court(1)).getByText('Finished')).toBeInTheDocument();
  await user.click(teamB); // mis-tap fixed: the other team won
  expect(store.getState().session.matchLog).toHaveLength(1);
  expect(store.getState().session.matchLog[0].winnerSide).toBe('B');
  expect(store.getState().session.players.reduce((n, p) => n + p.wins, 0)).toBe(2);
  await user.click(within(court(1)).getByRole('button', { pressed: true })); // tap again clears
  expect(store.getState().session.matchLog).toHaveLength(0);
  expect(store.getState().session.players.reduce((n, p) => n + p.wins + p.losses, 0)).toBe(0);
});

it('explains instead of silently discarding games that are still being played', async () => {
  const { user, store } = await inPlay();
  await user.click(screen.getByRole('button', { name: 'Start next round' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/no result/)).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Keep playing' }));
  expect(store.getState().session.currentRound).toBe(1);
  await user.click(screen.getByRole('button', { name: 'Start next round' }));
  await user.click(screen.getByRole('button', { name: 'Start new round anyway' }));
  expect(store.getState().session.currentRound).toBe(2);
});

it('starts the next round without asking once every game is done', async () => {
  const { user, store } = await inPlay();
  await user.click(within(court(1)).getAllByRole('button', { name: /Tap if they won/ })[0]);
  await user.click(screen.getByRole('button', { name: 'Start next round' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(store.getState().session.currentRound).toBe(2);
});

it('lets late arrivals join during play and handles breaks', async () => {
  const { user, store } = await inPlay();
  await user.click(screen.getByRole('button', { name: 'Players' }));
  await user.type(screen.getByLabelText('Player name'), 'Gus');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(store.getState().session.players.map((p) => p.name)).toContain('Gus');
  await user.click(screen.getByRole('button', { name: 'Gus is taking a break' }));
  expect(store.getState().session.players.find((p) => p.name === 'Gus')!.active).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Gus is back' }));
  expect(store.getState().session.players.find((p) => p.name === 'Gus')!.active).toBe(true);
});

it('blocks removing someone on a court, and lets a removal be undone', async () => {
  const { user, store } = await inPlay();
  const playing = store.getState().session.activeMatches[0].sideA[0].name;
  const sitting = store
    .getState()
    .session.players.find(
      (p) =>
        !store
          .getState()
          .session.activeMatches.some((m) => [...m.sideA, ...m.sideB].some((x) => x.id === p.id)),
    )!.name;
  await user.click(screen.getByRole('button', { name: 'Players' }));
  await user.click(screen.getByRole('button', { name: `More for ${playing}` }));
  expect(screen.getByRole('button', { name: /Playing now, can't remove/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: `More for ${sitting}` }));
  await user.click(screen.getByRole('button', { name: `Remove ${sitting}` }));
  expect(store.getState().session.players.map((p) => p.name)).not.toContain(sitting);
  await user.click(screen.getByRole('button', { name: 'Undo' }));
  expect(store.getState().session.players.map((p) => p.name)).toContain(sitting);
});

it('allows swaps in the first two minutes, then only injury replacements', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const { user, store } = await inPlay();
  await user.click(within(court(1)).getByRole('button', { name: /Swap a player/ }));
  const swaps = within(court(1)).getAllByRole('button', { name: 'Swap' });
  expect(swaps).toHaveLength(4);
  await user.click(swaps[0]);
  const outgoing = store.getState().session.activeMatches[0].sideA[0].id;
  // whoever the app offers: sitting-out players are chosen fairly, not by name
  const picker = within(court(1)).getByText(/Who comes in for/).parentElement!;
  await user.click(within(picker).getAllByRole('button')[0]);
  expect(store.getState().session.activeMatches[0].sideA[0].id).not.toBe(outgoing);
  act(() => vi.advanceTimersByTime(120000));
  expect(within(court(1)).queryAllByRole('button', { name: 'Swap' })).toHaveLength(0);
  expect(within(court(1)).getAllByRole('button', { name: 'Got hurt' })[0]).toBeEnabled();
});

it('changes courts mid-session without losing the round', async () => {
  const { user, store } = await inPlay();
  await user.click(screen.getByRole('button', { name: 'Change' }));
  expect(screen.getByRole('heading', { name: 'Courts and game type' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(court(1)).toBeInTheDocument();
  expect(store.getState().session.currentRound).toBe(1);
});

it('starts a new game day in setup and returns to play when switching back', async () => {
  const { user, store } = await inPlay();
  const first = store.getState().sessionId;
  await user.click(screen.getByRole('button', { name: /Today's games/ }));
  await user.click(screen.getByRole('button', { name: 'Start new' }));
  expect(screen.getByRole('heading', { name: "Who's here today?" })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Today's games/ }));
  const entry = store.getState().entries.find((e) => e.id === first)!;
  // the new day must not share the first day's name
  expect(store.getState().entries.map((e) => e.name)).toHaveLength(
    new Set(store.getState().entries.map((e) => e.name)).size,
  );
  await user.click(screen.getByRole('button', { name: entry.name }));
  expect(court(1)).toBeInTheDocument();
});

it('shows standings and clears recent games only after confirming', async () => {
  const { user, store } = await inPlay();
  await user.click(within(court(1)).getAllByRole('button', { name: /Tap if they won/ })[0]);
  await user.click(screen.getByRole('button', { name: 'Results' }));
  expect(screen.getByRole('list', { name: 'Standings' })).toBeInTheDocument();
  expect(screen.getByText(/beat/)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Clear the list of recent games/ }));
  await user.click(screen.getByRole('button', { name: 'Keep the list' }));
  expect(store.getState().session.matchLog).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: /Clear the list of recent games/ }));
  await user.click(screen.getByRole('button', { name: 'Clear it' }));
  expect(store.getState().session.matchLog).toHaveLength(0);
});

it('gives spectators a read-only view without touching organizer storage', async () => {
  const before = localStorage.length;
  const rpc = createRpcClient(
    async () =>
      new Response(
        JSON.stringify([
          {
            payload: {
              players: [
                { id: 'a', name: 'Viewer A' },
                { id: 'b', name: 'Viewer B' },
              ],
              currentRound: 1,
              activeMatches: [{ id: 'm', sideA: ['a'], sideB: ['b'], status: 'active' }],
            },
            updated_at: '2026-10-20T00:00:00Z',
          },
        ]),
      ),
  );
  render(<App sharedCode="spectator" rpc={rpc} />);
  expect((await screen.findAllByText('Viewer A')).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: /Tap if they won/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Start next round' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Players' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Results' }));
  expect(localStorage.length).toBe(before);
});

it('puts late arrivals at the back of the line by default (fair open play)', async () => {
  const { user, store } = await inPlay();
  await user.click(screen.getByRole('button', { name: 'Players' }));
  expect(screen.getByText(/Late arrivals join the back of the line/)).toBeInTheDocument();
  await user.type(screen.getByLabelText('Player name'), 'Gus');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByText(/Gus added\. They join the back of the line\./)).toBeInTheDocument();
  expect(store.getState().session.players.find((p) => p.name === 'Gus')!.roundsWaited).toBe(0);
});

it('lets the organizer give late arrivals the next round (family and friends)', async () => {
  const { user, store } = await inPlay();
  await user.click(screen.getByRole('button', { name: 'Change' }));
  await user.click(screen.getByRole('button', { name: 'More options' }));
  await user.click(screen.getByRole('radio', { name: /They play in the next round/ }));
  await user.click(screen.getByRole('button', { name: 'Done' }));
  await user.click(screen.getByRole('button', { name: 'Players' }));
  expect(screen.getByText(/Late arrivals play in the next round/)).toBeInTheDocument();
  await user.type(screen.getByLabelText('Player name'), 'Gus');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByText(/Gus added\. They'll play in the next round\./)).toBeInTheDocument();
  // Deterministic: Gus must outrank everyone already waiting, not just get lucky.
  const players = store.getState().session.players;
  const gusWait = players.find((p) => p.name === 'Gus')!.roundsWaited;
  expect(gusWait).toBeGreaterThan(
    Math.max(...players.filter((p) => p.name !== 'Gus').map((p) => p.roundsWaited)),
  );

  await user.click(screen.getByRole('button', { name: 'Courts' }));
  await user.click(screen.getByRole('button', { name: 'Start next round' }));
  await user.click(screen.getByRole('button', { name: 'Start new round anyway' }));
  const gus = store.getState().session.players.find((p) => p.name === 'Gus')!.id;
  const onCourt = store
    .getState()
    .session.activeMatches.flatMap((m) => [...m.sideA, ...m.sideB].map((p) => p.id));
  expect(onCourt).toContain(gus);
});

/** 10 players on 2 courts: 8 playing, 2 sitting out. */
async function inPlayTwoCourts() {
  const user = userEvent.setup();
  const store = seeded(['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fin', 'Gil', 'Hal', 'Ida', 'Jo']);
  render(<App store={store} />);
  await user.click(screen.getByRole('button', { name: 'Next: courts' }));
  await user.click(screen.getByRole('button', { name: 'Start playing' }));
  return { user, store };
}
const sideIds = (store: ReturnType<typeof createSessionStore>, court: number) => {
  const m = store.getState().session.activeMatches[court];
  return [...m.sideA, ...m.sideB].map((p) => p.name);
};

it('moves players between courts with tap-then-tap (no dragging needed)', async () => {
  const { user, store } = await inPlayTwoCourts();
  const a = sideIds(store, 0)[0];
  const b = sideIds(store, 1)[0];
  await user.click(screen.getByRole('button', { name: 'Move players' }));
  expect(screen.queryByRole('button', { name: /Tap if they won/ })).not.toBeInTheDocument();
  await user.click(within(court(1)).getByRole('button', { name: a }));
  expect(within(court(1)).getByRole('button', { name: a })).toHaveAttribute('aria-pressed', 'true');
  await user.click(within(court(2)).getByRole('button', { name: b }));
  expect(sideIds(store, 0)).toContain(b);
  expect(sideIds(store, 1)).toContain(a);
  expect(screen.getByText(`${a} and ${b} swapped places.`)).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Done moving players' }));
  expect(within(court(1)).getAllByRole('button', { name: /Tap if they won/ })).toHaveLength(2);
});

it('brings someone in from the sitting-out list by tapping', async () => {
  const { user, store } = await inPlayTwoCourts();
  await user.click(screen.getByRole('button', { name: 'Move players' }));
  const bench = screen.getByRole('region', { name: 'Sitting out' });
  const benchName = within(bench).getAllByRole('button')[0].textContent!;
  const out = sideIds(store, 0)[0];
  await user.click(within(bench).getByRole('button', { name: benchName }));
  await user.click(within(court(1)).getByRole('button', { name: out }));
  expect(sideIds(store, 0)).toContain(benchName);
  expect(screen.getByText(`${benchName} is in for ${out}.`)).toBeInTheDocument();
});

it('locks a finished court and says why', async () => {
  const { user, store } = await inPlayTwoCourts();
  await user.click(within(court(1)).getAllByRole('button', { name: /Tap if they won/ })[0]);
  await user.click(screen.getByRole('button', { name: 'Move players' }));
  expect(within(court(1)).getByText(/Locked · Finished/)).toBeInTheDocument();
  const name = sideIds(store, 0)[0];
  await user.click(within(court(1)).getByRole('button', { name }));
  expect(screen.getByText(new RegExp(`${name}'s court is locked`))).toBeInTheDocument();
  expect(within(court(1)).getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
});

it('offers other-court players in the Swap panel too', async () => {
  const { user, store } = await inPlayTwoCourts();
  const a = sideIds(store, 0)[0];
  const b = sideIds(store, 1)[1];
  await user.click(within(court(1)).getByRole('button', { name: /Swap a player/ }));
  const row = within(court(1)).getByText(a).closest('.ez-swap-row') as HTMLElement;
  await user.click(within(row).getByRole('button', { name: 'Swap' }));
  expect(within(row).getByText('Or swap with someone on another court')).toBeInTheDocument();
  await user.click(within(row).getByRole('button', { name: b }));
  expect(sideIds(store, 0)).toContain(b);
  expect(sideIds(store, 1)).toContain(a);
});
