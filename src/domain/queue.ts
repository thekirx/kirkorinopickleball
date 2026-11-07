import type { QueuedGame, SessionState } from './types';
export const draftPlayerIds = (game: QueuedGame) => [...game.sideA, ...game.sideB];
export function reservedPlayerIds(state: SessionState) {
  return new Set(state.queuedGames.flatMap(draftPlayerIds));
}
export function busyPlayerIds(state: SessionState) {
  return new Set(
    state.activeMatches
      .filter((m) => m.status !== 'finished')
      .flatMap((m) => [...m.sideA, ...m.sideB].map((p) => p.id)),
  );
}
export function validateQueuedGames(raw: unknown, state: SessionState): QueuedGame[] {
  const busy = busyPlayerIds(state),
    active = new Set(state.players.filter((p) => p.active).map((p) => p.id)),
    used = new Set<string>(),
    games = new Set<string>();
  if (!Array.isArray(raw)) return [];
  const result: QueuedGame[] = [];
  for (const value of raw) {
    if (result.length === 3) break;
    if (!value || typeof value !== 'object') continue;
    const g = value as QueuedGame,
      per = g.matchType === 'doubles' ? 2 : g.matchType === 'singles' ? 1 : 0;
    if (
      !per ||
      typeof g.id !== 'string' ||
      !g.id ||
      games.has(g.id) ||
      state.activeMatches.some((m) => m.id === g.id) ||
      !Array.isArray(g.sideA) ||
      !Array.isArray(g.sideB) ||
      g.sideA.length !== per ||
      g.sideB.length !== per
    )
      continue;
    const ids = draftPlayerIds(g);
    if (
      new Set(ids).size !== ids.length ||
      ids.some((id) => typeof id !== 'string' || !active.has(id) || busy.has(id) || used.has(id))
    )
      continue;
    ids.forEach((id) => used.add(id));
    games.add(g.id);
    result.push({ id: g.id, matchType: g.matchType, sideA: [...g.sideA], sideB: [...g.sideB] });
  }
  return result;
}
/** Preserve published order on read; organizer reconciliation applies manual priority then wait age. */
export function reconcileQueue(
  state: SessionState,
  manual: string[] = [],
  preservePublishedOrder = false,
) {
  const before = state.queuedGames.length;
  state.queuedGames = validateQueuedGames(state.queuedGames, state);
  const excluded = new Set([...busyPlayerIds(state), ...reservedPlayerIds(state)]);
  const previous = new Map(state.waitingPlayerIds.map((id, index) => [id, index]));
  const priority = new Map(manual.map((id, index) => [id, index]));
  const eligible = state.players.filter((p) => p.active && !excluded.has(p.id));
  const tie = new Map(
    eligible.map((p) => [p.id, previous.get(p.id) ?? previous.size + Math.random()]),
  );
  eligible.sort((a, b) => {
    if (preservePublishedOrder) {
      const prior = (previous.get(a.id) ?? Infinity) - (previous.get(b.id) ?? Infinity);
      if (prior && !Number.isNaN(prior)) return prior;
    }
    const picked = (priority.get(a.id) ?? Infinity) - (priority.get(b.id) ?? Infinity);
    if (picked && !Number.isNaN(picked)) return picked;
    return b.roundsWaited - a.roundsWaited || tie.get(a.id)! - tie.get(b.id)!;
  });
  state.waitingPlayerIds = eligible.map((p) => p.id);
  return { invalidated: before - state.queuedGames.length };
}
