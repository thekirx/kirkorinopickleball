import { it, expect } from 'vitest';
import { createEngine, PLAYER_CHANGE_WINDOW_MS } from './engine';
import { migrate } from './migrate';

// 10 players on 2 doubles courts: 8 playing, 2 sitting out.
function twoCourts() {
  const state = migrate(null);
  const e = createEngine(state);
  'Ana Ben Cy Dee Eve Fin Gil Hal Ida Jo'.split(' ').forEach((n) => e.addPlayer(n, 'intermediate'));
  const plan = e.createRoundPlan({ matchType: 'doubles', courtCount: 2, teammateLimit: Infinity });
  if (!plan.ok) throw Error(plan.message);
  e.applyRoundPlan(plan, 'doubles', 1_000);
  const [c1, c2] = state.activeMatches;
  const onCourt = new Set(
    state.activeMatches.flatMap((m) => [...m.sideA, ...m.sideB].map((p) => p.id)),
  );
  const sitting = state.players.filter((p) => !onCourt.has(p.id));
  return { state, e, c1, c2, sitting, now: 1_000 + 1_000 };
}
const ids = (side: { id: string }[]) => side.map((p) => p.id);
const pairCount = (s: ReturnType<typeof migrate>, a: string, b: string) =>
  s.teammateHistory.get([a, b].sort().join('|')) ?? 0;

it('swaps players between two courts and keeps everyone exactly once', () => {
  const { state, e, c1, c2, now } = twoCourts();
  const a = c1.sideA[0].id,
    b = c2.sideB[1].id;
  expect(e.swapPlayers(a, b, now).ok).toBe(true);
  expect(ids(c1.sideA)).toContain(b);
  expect(ids(c2.sideB)).toContain(a);
  const all = state.activeMatches.flatMap((m) => [...ids(m.sideA), ...ids(m.sideB)]);
  expect(new Set(all).size).toBe(8);
});

it('moves teammate history with the players', () => {
  const { state, e, c1, c2, now } = twoCourts();
  const a = c1.sideA[0].id,
    partner = c1.sideA[1].id,
    b = c2.sideB[0].id;
  expect(pairCount(state, a, partner)).toBe(1);
  e.swapPlayers(a, b, now);
  expect(pairCount(state, a, partner)).toBe(0);
  expect(pairCount(state, b, partner)).toBe(1);
});

it('brings a sitting-out player in like a substitution', () => {
  const { state, e, c1, sitting, now } = twoCourts();
  const out = c1.sideB[0];
  const inn = sitting[0];
  const waitedBefore = out.roundsWaited;
  const result = e.swapPlayers(inn.id, out.id, now);
  expect(result).toMatchObject({ ok: true, message: `${inn.name} is in for ${out.name}.` });
  expect(ids(c1.sideB)).toContain(inn.id);
  expect(state.players.find((p) => p.id === inn.id)!.roundsWaited).toBe(0);
  expect(state.players.find((p) => p.id === out.id)!.roundsWaited).toBe(waitedBefore + 1);
});

it('refuses swaps with a plain reason and changes nothing', () => {
  const { state, e, c1, c2, sitting, now } = twoCourts();
  const before = JSON.stringify(state.activeMatches.map((m) => [ids(m.sideA), ids(m.sideB)]));
  expect(e.swapBlockReason(sitting[0].id, sitting[1].id, now)).toMatch(/Both are sitting out/);
  expect(e.swapBlockReason(c1.sideA[0].id, c1.sideA[1].id, now)).toMatch(/same team/);
  expect(e.swapBlockReason(c1.sideA[0].id, c1.sideA[0].id, now)).toMatch(/someone else/);
  e.setPlayerActive(sitting[0].id, false);
  expect(e.swapBlockReason(sitting[0].id, c1.sideA[0].id, now)).toMatch(/on a break/);
  const late = 1_000 + PLAYER_CHANGE_WINDOW_MS + 1;
  expect(e.swapBlockReason(c1.sideA[0].id, c2.sideA[0].id, late)).toMatch(/over 2 minutes/);
  expect(e.swapPlayers(c1.sideA[0].id, c2.sideA[0].id, late).ok).toBe(false);
  expect(JSON.stringify(state.activeMatches.map((m) => [ids(m.sideA), ids(m.sideB)]))).toBe(before);
});

it('can swap across the net within one court (changing teams)', () => {
  const { e, c1, now } = twoCourts();
  const a = c1.sideA[0].id,
    b = c1.sideB[0].id;
  expect(e.swapPlayers(a, b, now).ok).toBe(true);
  expect(ids(c1.sideA)).toContain(b);
  expect(ids(c1.sideB)).toContain(a);
});

it('never double-books across 200 seeded sessions of generation, swaps and injury replacement', () => {
  let successfulSwaps = 0,
    successfulInjuries = 0;
  for (let seed = 1; seed <= 200; seed++) {
    let value = seed;
    const random = () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
    const state = migrate(null),
      engine = createEngine(state, random);
    const count = 6 + Math.floor(random() * 9);
    for (let index = 0; index < count; index++) engine.addPlayer(`Player ${index}`, 'intermediate');
    const assertUnique = () => {
      const assigned = state.activeMatches.flatMap((m) =>
        [...m.sideA, ...m.sideB].map((p) => p.id),
      );
      expect(new Set(assigned).size, `seed ${seed}`).toBe(assigned.length);
      expect(assigned.every((id) => state.players.some((p) => p.id === id))).toBe(true);
    };
    for (let round = 0; round < 4; round++) {
      state.players.forEach((p) => engine.setPlayerActive(p.id, true));
      const now = 1000 + round * 200000;
      const plan = engine.createRoundPlan({
        matchType: 'doubles',
        courtCount: 1 + Math.floor(random() * 3),
        teammateLimit: Infinity,
        priorityPlayerIds: state.players
          .slice()
          .reverse()
          .map((p) => p.id),
      });
      if (!plan.ok) throw Error(plan.message);
      engine.applyRoundPlan(plan, 'doubles', now);
      assertUnique();
      for (let move = 0; move < 4; move++) {
        const a = state.players[Math.floor(random() * count)],
          b = state.players[Math.floor(random() * count)];
        if (engine.swapPlayers(a.id, b.id, now + 100).ok) successfulSwaps++;
        assertUnique();
      }
      const match = state.activeMatches[0];
      if (
        engine.substituteInjuredPlayer(
          match.id,
          match.sideA[0].id,
          now + PLAYER_CHANGE_WINDOW_MS + 1,
        ).ok
      )
        successfulInjuries++;
      assertUnique();
    }
  }
  expect(successfulSwaps).toBeGreaterThan(200);
  expect(successfulInjuries).toBeGreaterThan(200);
});
