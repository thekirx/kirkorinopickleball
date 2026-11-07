import { expect, it } from 'vitest';
import { playerStrength, winStreak } from './strength';
import { createEngine } from './engine';
import { migrate } from './migrate';
import type { MatchLogEntry, Player } from './types';
const player = (
  name: string,
  skill: Player['skill'] = 'intermediate',
  wins = 0,
  losses = 0,
): Player => ({
  id: name,
  name,
  skill,
  wins,
  losses,
  active: true,
  roundsWaited: 0,
  lastPlayedRound: null,
});
const game = (n: number, winners: string[], losers: string[]): MatchLogEntry => ({
  id: `game-${n}`,
  round: n,
  court: 1,
  matchType: 'Doubles',
  winners,
  losers,
  winnerSide: 'A',
  finishedAt: new Date(1000 * n).toISOString(),
});
it('keeps skill dominant and uses smoothed records without inflating a newcomer', () => {
  expect(playerStrength(player('A'), [])).toBe(2000);
  expect(playerStrength(player('A', 'intermediate', 10, 0), [])).toBeGreaterThan(2000);
  expect(playerStrength(player('A', 'intermediate', 0, 10), [])).toBeLessThan(2000);
  expect(playerStrength(player('A', 'beginner', 100, 0), [])).toBeLessThan(
    playerStrength(player('B', 'intermediate', 0, 100), []),
  );
});
it('uses actual recent consecutive wins, ignores unrelated games and stops at a loss', () => {
  const log = [
    game(2, ['B'], ['A']),
    game(4, ['A'], ['B']),
    game(1, ['A'], ['B']),
    game(5, ['X'], ['Y']),
    game(3, ['A'], ['B']),
  ];
  expect(winStreak(player('A'), log)).toBe(2);
  expect(playerStrength(player('A'), log)).toBeGreaterThan(playerStrength(player('B'), log));
});
it('splits equal-skill players with strong records and streaks rather than stacking them', () => {
  const state = migrate(null);
  state.players = [
    player('A', 'intermediate', 12, 0),
    player('B', 'intermediate', 12, 0),
    player('C', 'intermediate', 0, 12),
    player('D', 'intermediate', 0, 12),
  ];
  state.matchLog = [game(1, ['A', 'B'], ['C', 'D'])];
  const engine = createEngine(state, () => 0.37);
  const plan = engine.createRoundPlan({
    matchType: 'doubles',
    courtCount: 1,
    teammateLimit: Infinity,
  });
  if (!plan.ok) throw Error(plan.message);
  for (const side of [plan.matches[0].sideA, plan.matches[0].sideB])
    expect(side.filter((p) => p.wins === 12)).toHaveLength(1);
});
it('uses streaks as a tiebreaker for identical skills and records without changing selected queue players', () => {
  const state = migrate(null);
  state.players = ['A', 'B', 'C', 'D', 'E'].map((n) => player(n));
  state.matchLog = [game(1, ['A', 'B'], ['C', 'D'])];
  state.players[4].roundsWaited = 0;
  for (const p of state.players.slice(0, 4)) p.roundsWaited = 4;
  const engine = createEngine(state, () => 0.37);
  const plan = engine.createRoundPlan({
    matchType: 'doubles',
    courtCount: 1,
    teammateLimit: Infinity,
  });
  if (!plan.ok) throw Error(plan.message);
  expect(plan.selectedPlayers.map((p) => p.name).sort()).toEqual(['A', 'B', 'C', 'D']);
  for (const side of [plan.matches[0].sideA, plan.matches[0].sideB])
    expect(side.filter((p) => ['A', 'B'].includes(p.name))).toHaveLength(1);
});

it('recomputes form after a score correction or history clear without rewriting standings', () => {
  const state = migrate(null);
  state.players = ['A', 'B', 'C', 'D'].map((n) => player(n));
  const engine = createEngine(state);
  const plan = engine.createRoundPlan({
    matchType: 'doubles',
    courtCount: 1,
    teammateLimit: Infinity,
  });
  if (!plan.ok) throw Error(plan.message);
  engine.applyRoundPlan(plan, 'doubles');
  const match = state.activeMatches[0],
    winner = match.sideA[0];
  engine.declareWinner(match.id, 'A');
  expect(winStreak(winner, state.matchLog)).toBe(1);
  engine.clearResult(match.id);
  engine.declareWinner(match.id, 'B');
  expect(winStreak(winner, state.matchLog)).toBe(0);
  const other = match.sideB[0],
    wins = other.wins,
    rated = playerStrength(other, state.matchLog);
  state.matchLog = [];
  expect(winStreak(other, state.matchLog)).toBe(0);
  expect(playerStrength(other, state.matchLog)).toBeLessThan(rated);
  expect(other.wins).toBe(wins);
});

it('balances Advanced plus Beginner against two Intermediates when all are next in queue', () => {
  const state = migrate(null);
  state.players = [
    player('A', 'pro'),
    player('B', 'intermediate'),
    player('C', 'intermediate'),
    player('D', 'beginner'),
  ];
  const engine = createEngine(state, () => 0.37);
  const plan = engine.createRoundPlan({
    matchType: 'doubles',
    courtCount: 1,
    teammateLimit: Infinity,
  });
  if (!plan.ok) throw Error(plan.message);
  const advancedTeam = [plan.matches[0].sideA, plan.matches[0].sideB].find((side) =>
    side.some((p) => p.skill === 'pro'),
  )!;
  expect(advancedTeam.map((p) => p.skill).sort()).toEqual(['beginner', 'pro']);
});
