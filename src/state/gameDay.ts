import { reservedPlayerIds } from '../domain/queue';
import type { MatchType, SessionState } from '../domain/types';

/** Organizer-only metadata. Never part of the shared/exported payload. */
export interface GameDaySettings {
  type: MatchType;
  courts: number;
  draftCount: number;
  limit: string;
  lateArrivals: 'back' | 'next';
  nextPlayerIds: string[];
  arrivals: { round: number; ids: string[] };
}
export const defaultGameDaySettings = (): GameDaySettings => ({
  type: 'doubles',
  courts: 2,
  draftCount: 1,
  limit: '2',
  lateArrivals: 'back',
  nextPlayerIds: [],
  arrivals: { round: 0, ids: [] },
});
const ids = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string'))]
    : [];
export function normalizeGameDaySettings(raw: unknown): GameDaySettings {
  const value = raw && typeof raw === 'object' ? (raw as Partial<GameDaySettings>) : {};
  return {
    draftCount:
      typeof value.draftCount === 'number' && Number.isInteger(value.draftCount)
        ? Math.max(1, Math.min(3, value.draftCount))
        : 1,
    type: value.type === 'singles' ? 'singles' : 'doubles',
    courts:
      typeof value.courts === 'number' && Number.isFinite(value.courts)
        ? Math.max(1, Math.min(20, Math.round(value.courts)))
        : 2,
    limit: ['1', '2', '3', 'unlimited'].includes(value.limit ?? '') ? value.limit! : '2',
    lateArrivals: value.lateArrivals === 'next' ? 'next' : 'back',
    nextPlayerIds: ids(value.nextPlayerIds),
    arrivals: {
      round:
        Number.isInteger(value.arrivals?.round) && value.arrivals!.round >= 0
          ? value.arrivals!.round
          : 0,
      ids: ids(value.arrivals?.ids),
    },
  };
}
export function pruneGameDay(settings: GameDaySettings, session: SessionState): GameDaySettings {
  const playing = new Set(
    session.activeMatches
      .filter((m) => m.status !== 'finished')
      .flatMap((m) => [...m.sideA, ...m.sideB].map((p) => p.id)),
  );
  const eligible = new Set(
    session.players
      .filter((p) => p.active && !playing.has(p.id) && !reservedPlayerIds(session).has(p.id))
      .map((p) => p.id),
  );
  return { ...settings, nextPlayerIds: settings.nextPlayerIds.filter((id) => eligible.has(id)) };
}
