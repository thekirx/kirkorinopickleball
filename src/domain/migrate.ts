import type { ActiveMatch, Player, TournamentStateV2, MatchLogEntry, Skill } from './types';
export const SCHEMA_VERSION = 2;
const object = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
const array = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const count = (x: unknown) =>
  typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0;
export function migrate(payload: unknown): TournamentStateV2 {
  const raw = object(payload);
  if (raw.schemaVersion !== undefined && raw.schemaVersion !== 2)
    throw new Error('Unsupported session schema version. Export a backup and update KirQ.');
  const ids = new Set<string>();
  const players: Player[] = array(raw.players).flatMap((value) => {
    const p = object(value);
    if (
      typeof p.id !== 'string' ||
      !p.id ||
      typeof p.name !== 'string' ||
      !p.name.trim() ||
      ids.has(p.id)
    )
      return [];
    ids.add(p.id);
    return [
      {
        id: p.id,
        name: p.name,
        skill: (['beginner', 'intermediate', 'pro'].includes(String(p.skill))
          ? p.skill
          : 'intermediate') as Skill,
        active: p.active !== false,
        roundsWaited: count(p.roundsWaited),
        wins: count(p.wins),
        losses: count(p.losses),
        lastPlayedRound: typeof p.lastPlayedRound === 'number' ? count(p.lastPlayedRound) : null,
      },
    ];
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  const assigned = new Set<string>();
  const matches = new Set<string>();
  const activeMatches: ActiveMatch[] = array(raw.activeMatches).flatMap((value) => {
    const m = object(value);
    if (typeof m.id !== 'string' || matches.has(m.id)) return [];
    const a = array(m.sideA),
      b = array(m.sideB);
    const all = [...a, ...b];
    if (
      ![1, 2].includes(a.length) ||
      a.length !== b.length ||
      new Set(all).size !== all.length ||
      all.some((id) => typeof id !== 'string' || !byId.has(id) || assigned.has(id))
    )
      return [];
    all.forEach((id) => assigned.add(id as string));
    matches.add(m.id);
    return [
      {
        id: m.id,
        courtId: typeof m.courtId === 'string' && m.courtId ? m.courtId : `court-${m.id}`,
        sideA: a.map((id) => byId.get(id as string)!),
        sideB: b.map((id) => byId.get(id as string)!),
        status: m.status === 'finished' ? 'finished' : 'active',
        winnerSide: m.winnerSide === 'A' || m.winnerSide === 'B' ? m.winnerSide : null,
        generatedAt: count(m.generatedAt),
      },
    ];
  });
  const teammateHistory = new Map<string, number>();
  array(raw.teammateHistory).forEach((pair) => {
    if (Array.isArray(pair) && typeof pair[0] === 'string' && count(pair[1]) > 0)
      teammateHistory.set(pair[0], count(pair[1]));
  });
  const matchLog: MatchLogEntry[] = array(raw.matchLog).flatMap((value) => {
    const e = object(value);
    if (
      typeof e.id !== 'string' ||
      !Array.isArray(e.winners) ||
      !Array.isArray(e.losers) ||
      typeof e.finishedAt !== 'string' ||
      !Number.isFinite(Date.parse(e.finishedAt))
    )
      return [];
    return [
      {
        id: e.id,
        round: count(e.round),
        court: count(e.court),
        matchType: typeof e.matchType === 'string' ? e.matchType : 'Doubles',
        winners: e.winners.filter((v): v is string => typeof v === 'string'),
        losers: e.losers.filter((v): v is string => typeof v === 'string'),
        winnerSide: e.winnerSide === 'B' ? 'B' : 'A',
        finishedAt: e.finishedAt,
      },
    ];
  });
  return {
    schemaVersion: 2,
    players,
    currentRound: count(raw.currentRound),
    activeMatches,
    matchLog,
    teammateHistory,
    events: [{ code: 'open', label: 'Open Play', format: { id: 'openRotation' } }],
  };
}
