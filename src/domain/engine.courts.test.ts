import { expect, it } from 'vitest';
import { createEngine } from './engine';
import { migrate } from './migrate';
import { serializeState } from './serialize';
const config = { matchType: 'doubles' as const, courtCount: 2, teammateLimit: Infinity };
function playing() {
  const state = migrate(null),
    engine = createEngine(state);
  for (let n = 0; n < 12; n++) engine.addPlayer(`Player ${n}`, 'intermediate');
  const plan = engine.createRoundPlan(config);
  if (!plan.ok) throw Error(plan.message);
  engine.applyRoundPlan(plan, 'doubles', 1000);
  return { state, engine };
}
const ids = (match: ReturnType<typeof migrate>['activeMatches'][0]) =>
  [...match.sideA, ...match.sideB].map((p) => p.id);
it('starts the finished court independently while keeping the other game and busy-player wait unchanged', () => {
  const { state, engine } = playing();
  const [first, other] = state.activeMatches;
  engine.declareWinner(first.id, 'A');
  const before = JSON.stringify(other);
  const busyWait = other.sideA[0].roundsWaited;
  const waiting = state.players.filter((p) => !state.activeMatches.flatMap(ids).includes(p.id));
  const result = engine.startCourtGame(
    1,
    { ...config, priorityPlayerIds: waiting.map((p) => p.id) },
    200000,
  );
  expect(result.ok).toBe(true);
  expect(JSON.stringify(state.activeMatches.find((m) => m.id === other.id))).toBe(before);
  expect(other.sideA[0].roundsWaited).toBe(busyWait);
  const next = state.activeMatches.find((m) => engine.getCourtNumber(m) === 1)!;
  expect(ids(next).sort()).toEqual(waiting.map((p) => p.id).sort());
  expect(next.generatedAt).toBe(200000);
  expect(state.matchLog).toHaveLength(1);
  expect(state.players.reduce((sum, p) => sum + p.wins, 0)).toBe(2);
  expect(migrate(serializeState(state))).toEqual(state);
});
it('never replaces an ongoing court and leaves failed scheduling unchanged', () => {
  const { state, engine } = playing();
  let before = serializeState(state);
  expect(engine.startCourtGame(1, config, 2000).ok).toBe(false);
  expect(serializeState(state)).toEqual(before);
  engine.declareWinner(state.activeMatches[0].id, 'A');
  const busy = new Set(ids(state.activeMatches[1]));
  state.players
    .filter((p) => !busy.has(p.id))
    .slice(1)
    .forEach((p) => engine.setPlayerActive(p.id, false));
  before = serializeState(state);
  expect(engine.startCourtGame(1, config, 3000).ok).toBe(false);
  expect(serializeState(state)).toEqual(before);
});
it('releases all finished players, archives reused score cards, preserves sparse court labels and v2 reload', () => {
  const { state, engine } = playing();
  const [one, two] = state.activeMatches;
  engine.declareWinner(one.id, 'A');
  engine.declareWinner(two.id, 'B');
  const firstIds = ids(one);
  expect(engine.startCourtGame(2, { ...config, priorityPlayerIds: firstIds }, 4000).ok).toBe(true);
  expect(state.activeMatches).toHaveLength(1);
  expect(engine.getCourtNumber(state.activeMatches[0])).toBe(2);
  expect(ids(state.activeMatches[0]).sort()).toEqual(firstIds.sort());
  expect(state.matchLog.map((e) => e.court).sort()).toEqual([1, 2]);
  const restored = migrate(serializeState(state));
  expect(restored.activeMatches).toHaveLength(1);
  expect(createEngine(restored).getCourtNumber(restored.activeMatches[0])).toBe(2);
  expect(engine.clearResult(one.id)).toBeUndefined();
  expect(state.activeMatches).toHaveLength(1);
  expect(engine.startCourtGame(1, config, 5000).ok).toBe(true);
  const all = state.activeMatches.flatMap(ids);
  expect(new Set(all).size).toBe(all.length);
});
it('allows a finished player to substitute into an ongoing court without losing saved results', () => {
  const { state, engine } = playing();
  const [one, two] = state.activeMatches;
  engine.declareWinner(one.id, 'A');
  const incoming = one.sideA[0];
  expect(engine.swapPlayers(incoming.id, two.sideA[0].id, 2000).ok).toBe(true);
  expect(ids(state.activeMatches.find((m) => m.id === two.id)!)).toContain(incoming.id);
  expect(state.activeMatches.find((m) => m.id === one.id)).toBeUndefined();
  expect(state.matchLog[0].id).toBe(one.id);
  expect(migrate(serializeState(state)).activeMatches).toHaveLength(1);
  expect(engine.getCourtNumber(state.activeMatches[0])).toBe(2);
});

it('normalizes legacy court ids only after a successful start and retains their court attribution', () => {
  const { state, engine } = playing();
  state.activeMatches[0].courtId = 'court-legacy-a';
  state.activeMatches[1].courtId = 'court-legacy-b';
  const before = serializeState(state);
  expect(engine.startCourtGame(1, config).ok).toBe(false);
  expect(serializeState(state)).toEqual(before);
  const [one, two] = state.activeMatches;
  engine.declareWinner(one.id, 'A');
  engine.declareWinner(two.id, 'B');
  expect(engine.startCourtGame(2, { ...config, priorityPlayerIds: ids(one) }, 9000).ok).toBe(true);
  expect(state.activeMatches[0].courtId).toBe('court-2');
  engine.declareWinner(state.activeMatches[0].id, 'A');
  expect(state.matchLog[0].court).toBe(2);
  expect(state.matchLog.find((e) => e.id === one.id)?.court).toBe(1);
});

it('never double-books or loses ongoing games across 200 seeded independent-court sessions and reloads', () => {
  let starts = 0,
    replacements = 0;
  for (let seed = 1; seed <= 200; seed++) {
    let value = seed;
    const random = () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
    let state = migrate(null),
      engine = createEngine(state, random);
    for (let i = 0; i < 10 + (seed % 7); i++) engine.addPlayer(`Synthetic ${i}`, 'intermediate');
    const cfg = { ...config, courtCount: 3 };
    const plan = engine.createRoundPlan(cfg);
    if (!plan.ok) throw Error(plan.message);
    engine.applyRoundPlan(plan, 'doubles', 1000);
    for (let step = 0; step < 20; step++) {
      const court = 1 + Math.floor(random() * 3),
        now = 1000 + step * 1000;
      const match = state.activeMatches.find((m) => engine.getCourtNumber(m) === court);
      if (!match || match.status === 'finished') {
        if (
          engine.startCourtGame(
            court,
            {
              ...cfg,
              priorityPlayerIds: state.players
                .slice()
                .reverse()
                .map((p) => p.id),
            },
            now,
          ).ok
        )
          starts++;
      } else if (random() < 0.6) engine.declareWinner(match.id, random() < 0.5 ? 'A' : 'B');
      else {
        const a = state.players[Math.floor(random() * state.players.length)];
        if (engine.swapPlayers(a.id, match.sideA[0].id, now).ok) replacements++;
        if (random() < 0.3)
          engine.substituteInjuredPlayer(match.id, match.sideB[0].id, now + 120000);
      }
      const assigned = state.activeMatches.flatMap(ids),
        occupied = state.activeMatches.map(engine.getCourtNumber);
      expect(new Set(assigned).size, `seed ${seed} step ${step}`).toBe(assigned.length);
      expect(new Set(occupied).size).toBe(occupied.length);
      const ongoing = state.activeMatches
        .filter((m) => m.status !== 'finished')
        .map((m) => m.id)
        .sort();
      state = migrate(serializeState(state));
      engine = createEngine(state, random);
      expect(
        state.activeMatches
          .filter((m) => m.status !== 'finished')
          .map((m) => m.id)
          .sort(),
      ).toEqual(ongoing);
    }
  }
  expect(starts).toBeGreaterThan(500);
  expect(replacements).toBeGreaterThan(100);
});

it('keeps a paused player’s ongoing court intact when removal is attempted', () => {
  const { state, engine } = playing();
  const match = state.activeMatches[0],
    p = match.sideA[0];
  engine.setPlayerActive(p.id, false);
  const before = serializeState(state);
  engine.removePlayer(p.id);
  expect(serializeState(state)).toEqual(before);
});

it('keeps an existing game when court count falls but refuses to refill that court afterward', () => {
  const { state, engine } = playing();
  const second = state.activeMatches[1];
  const before = serializeState(state);
  expect(engine.startCourtGame(2, { ...config, courtCount: 1 }).ok).toBe(false);
  expect(serializeState(state)).toEqual(before);
  engine.declareWinner(second.id, 'B');
  const finished = serializeState(state);
  expect(engine.startCourtGame(2, { ...config, courtCount: 1 }).ok).toBe(false);
  expect(serializeState(state)).toEqual(finished);
  expect(state.matchLog[0].court).toBe(2);
});
