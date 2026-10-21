import type { TournamentStateV2, SerializedTournamentStateV2 } from './types';
export function serializeState(state: TournamentStateV2): SerializedTournamentStateV2 {
  return {
    schemaVersion: 2,
    players: state.players.map((p) => ({ ...p })),
    currentRound: state.currentRound,
    activeMatches: state.activeMatches.map((m) => ({
      ...m,
      sideA: m.sideA.map((p) => p.id),
      sideB: m.sideB.map((p) => p.id),
    })),
    matchLog: state.matchLog.map((e) => ({ ...e, winners: [...e.winners], losers: [...e.losers] })),
    teammateHistory: [...state.teammateHistory],
    events: state.events.map((e) => ({ ...e, format: { ...e.format } })),
  };
}
