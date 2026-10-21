import { it, expect } from 'vitest';
import { createEngine } from './engine';
import { migrate } from './migrate';

function playing(names = ['Ana', 'Ben', 'Cy', 'Dee']) {
  const state = migrate(null);
  const e = createEngine(state);
  names.forEach((n) => e.addPlayer(n, 'intermediate'));
  const plan = e.createRoundPlan({ matchType: 'doubles', courtCount: 1, teammateLimit: Infinity });
  if (!plan.ok) throw Error(plan.message);
  e.applyRoundPlan(plan, 'doubles');
  return { state, e, match: state.activeMatches[0] };
}
const totals = (s: ReturnType<typeof migrate>) => ({
  wins: s.players.reduce((n, p) => n + p.wins, 0),
  losses: s.players.reduce((n, p) => n + p.losses, 0),
});

it('clears a result completely: counts, log entry and court status', () => {
  const { state, e, match } = playing();
  e.declareWinner(match.id, 'A');
  expect(totals(state)).toEqual({ wins: 2, losses: 2 });
  expect(state.matchLog).toHaveLength(1);
  e.clearResult(match.id);
  expect(totals(state)).toEqual({ wins: 0, losses: 0 });
  expect(state.matchLog).toHaveLength(0);
  expect(match.status).toBe('active');
  expect(match.winnerSide).toBeNull();
});

it('changing the winner leaves exactly one correct record', () => {
  const { state, e, match } = playing();
  e.declareWinner(match.id, 'A');
  e.clearResult(match.id);
  e.declareWinner(match.id, 'B');
  expect(state.matchLog).toHaveLength(1);
  expect(state.matchLog[0].winnerSide).toBe('B');
  match.sideB.forEach((p) => expect(state.players.find((x) => x.id === p.id)!.wins).toBe(1));
  match.sideA.forEach((p) => {
    const x = state.players.find((y) => y.id === p.id)!;
    expect([x.wins, x.losses]).toEqual([0, 1]);
  });
});

it('clearing an unfinished match changes nothing', () => {
  const { state, e, match } = playing();
  expect(e.clearResult(match.id)).toBeUndefined();
  expect(totals(state)).toEqual({ wins: 0, losses: 0 });
});

it('sets skill after the fact and rejects unknown values', () => {
  const state = migrate(null);
  const e = createEngine(state);
  e.addPlayer('Ana', 'intermediate');
  const id = state.players[0].id;
  expect(e.setPlayerSkill(id, 'pro').ok).toBe(true);
  expect(state.players[0].skill).toBe('pro');
  expect(e.setPlayerSkill(id, 'wizard' as never).ok).toBe(false);
  expect(state.players[0].skill).toBe('pro');
});

it('puts a prioritized late arrival into the very next round', () => {
  const { state, e } = playing(['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fin', 'Gil', 'Hal', 'Ida']);
  // 9 players, 1 court: 5 sat out with waited=1. Late arrival must beat all of them.
  e.addPlayer('Late', 'intermediate');
  const late = state.players.find((p) => p.name === 'Late')!;
  e.prioritizeForNextRound(late.id);
  for (let trial = 0; trial < 25; trial++) {
    const plan = createEngine(state).createRoundPlan({
      matchType: 'doubles',
      courtCount: 1,
      teammateLimit: Infinity,
    });
    if (!plan.ok) throw Error(plan.message);
    expect(plan.selectedPlayers.map((p) => p.id)).toContain(late.id);
  }
});

it('lets same-round late arrivals share priority instead of leapfrogging', () => {
  const { state, e } = playing(['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fin']);
  e.addPlayer('First', 'intermediate');
  e.addPlayer('Second', 'intermediate');
  const first = state.players.find((p) => p.name === 'First')!;
  const second = state.players.find((p) => p.name === 'Second')!;
  e.prioritizeForNextRound(first.id);
  e.prioritizeForNextRound(second.id, [first.id]);
  expect(second.roundsWaited).toBe(first.roundsWaited);
  const waiting = state.players.filter((p) => ![first.id, second.id].includes(p.id));
  expect(first.roundsWaited).toBeGreaterThan(Math.max(...waiting.map((p) => p.roundsWaited)));
});

it('leaves a late arrival at the back of the line by default', () => {
  const { state, e } = playing(['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fin']);
  e.addPlayer('Late', 'intermediate');
  expect(state.players.find((p) => p.name === 'Late')!.roundsWaited).toBe(0);
});
