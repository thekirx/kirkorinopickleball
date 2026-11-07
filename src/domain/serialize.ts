import type { SessionState, SerializedSessionState } from './types';
export function serializeState(state: SessionState): SerializedSessionState {
  return {
    schemaVersion: 3,
    queuedGames: state.queuedGames.map((game) => ({
      ...game,
      sideA: [...game.sideA],
      sideB: [...game.sideB],
    })),
    waitingPlayerIds: [...state.waitingPlayerIds],
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
