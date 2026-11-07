import { expect, it } from 'vitest';
import { createEngine } from './engine';
import { migrate } from './migrate';
import { serializeState } from './serialize';
import { reconcileQueue } from './queue';
const config = { matchType: 'doubles' as const, courtCount: 2, teammateLimit: Infinity };
function setup(n = 20) {
  const state = migrate(null),
    e = createEngine(state);
  for (let i = 0; i < n; i++) e.addPlayer(`Synthetic ${i}`, 'intermediate');
  const p = e.createRoundPlan(config);
  if (!p.ok) throw Error(p.message);
  e.applyRoundPlan(p, 'doubles', 1000);
  reconcileQueue(state, []);
  return { state, e };
}
it('drafts three fixed disjoint waiting-only games without changing playing stats or timers', () => {
  const { state, e } = setup();
  const before = structuredClone(state.activeMatches),
    stats = state.players.map((p) => [p.roundsWaited, p.wins, p.losses, p.lastPlayedRound]),
    history = [...state.teammateHistory];
  expect(e.draftNextGames(3, config).ok).toBe(true);
  expect(state.queuedGames).toHaveLength(3);
  const queued = state.queuedGames.flatMap((g) => [...g.sideA, ...g.sideB]),
    busy = e.getAssignedPlayerIds();
  expect(new Set(queued).size).toBe(12);
  expect(queued.every((id) => !busy.has(id))).toBe(true);
  expect(state.activeMatches).toEqual(before);
  expect(state.players.map((p) => [p.roundsWaited, p.wins, p.losses, p.lastPlayedRound])).toEqual(
    stats,
  );
  expect([...state.teammateHistory]).toEqual(history);
  expect(migrate(serializeState(state))).toEqual(state);
});
it('creates fewer when waiting people are insufficient and caps appends at three', () => {
  const { state, e } = setup(14);
  const r = e.draftNextGames(3, config);
  expect(r.ok).toBe(true);
  expect(r.created).toBe(1);
  expect(state.queuedGames).toHaveLength(1);
  const before = serializeState(state);
  expect(e.draftNextGames(1, config).ok).toBe(false);
  expect(serializeState(state)).toEqual(before);
  e.clearQueuedGames();
  expect(state.queuedGames).toEqual([]);
  const other = setup(24);
  expect(other.e.draftNextGames(2, config).created).toBe(2);
  const first = structuredClone(other.state.queuedGames);
  expect(other.e.draftNextGames(3, config).created).toBe(1);
  expect(other.state.queuedGames.slice(0, 2)).toEqual(first);
  expect(other.state.queuedGames).toHaveLength(3);
});
it('starts the first fixed draft on a free court while preserving the other court and remaining drafts', () => {
  const { state, e } = setup();
  e.draftNextGames(3, config);
  const [first, ...rest] = structuredClone(state.queuedGames),
    other = structuredClone(state.activeMatches[1]);
  e.declareWinner(state.activeMatches[0].id, 'A');
  expect(e.startCourtGame(1, config, 5000).ok).toBe(true);
  const next = state.activeMatches.find((m) => m.courtId === 'court-1')!;
  expect(next.id).toBe(first.id);
  expect(next.sideA.map((p) => p.id)).toEqual(first.sideA);
  expect(next.sideB.map((p) => p.id)).toEqual(first.sideB);
  expect(state.queuedGames).toEqual(rest);
  expect(state.activeMatches.find((m) => m.id === other.id)).toEqual(other);
});
it('protects reserved players from swaps and cancels affected drafts on unavailability', () => {
  const { state, e } = setup();
  e.draftNextGames(2, config);
  const reserved = state.queuedGames[0].sideA[0],
    busy = state.activeMatches[0].sideA[0];
  expect(e.getReplacementCandidates().some((p) => p.id === reserved)).toBe(false);
  expect(e.swapPlayers(reserved, busy.id, 2000).ok).toBe(false);
  e.setPlayerActive(reserved, false);
  expect(reconcileQueue(state, []).invalidated).toBe(1);
  expect(state.queuedGames).toHaveLength(1);
  expect(state.queuedGames.flatMap((g) => [...g.sideA, ...g.sideB])).not.toContain(reserved);
});
it('upgrades v2, retains shared manual order and validates malformed overlapping drafts', () => {
  const { state, e } = setup();
  const waiting = state.waitingPlayerIds;
  const manual = [waiting[waiting.length - 1]];
  reconcileQueue(state, manual);
  const saved = serializeState(state);
  expect(saved.schemaVersion).toBe(3);
  expect(migrate(saved).waitingPlayerIds).toEqual(state.waitingPlayerIds);
  const busy = state.activeMatches[0].sideA[0].id;
  expect(
    migrate({
      ...saved,
      queuedGames: [
        {
          id: 'bad',
          matchType: 'doubles',
          sideA: [busy, waiting[0]],
          sideB: [waiting[1], waiting[2]],
        },
      ],
    }).queuedGames,
  ).toEqual([]);
  const legacy = { ...saved, schemaVersion: 2 };
  delete (legacy as Record<string, unknown>).queuedGames;
  delete (legacy as Record<string, unknown>).waitingPlayerIds;
  const restored = migrate(legacy);
  expect(restored.schemaVersion).toBe(3);
  expect(restored.players).toEqual(state.players);
  expect(restored.activeMatches).toEqual(state.activeMatches);
  expect(restored.queuedGames).toEqual([]);
});
