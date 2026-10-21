export type Skill = 'beginner' | 'intermediate' | 'pro';
export type MatchType = 'singles' | 'doubles';
export interface Player {
  id: string;
  name: string;
  skill: Skill;
  active: boolean;
  roundsWaited: number;
  wins: number;
  losses: number;
  lastPlayedRound: number | null;
}
export interface ActiveMatch {
  id: string;
  courtId: string;
  sideA: Player[];
  sideB: Player[];
  status: 'active' | 'finished';
  winnerSide: 'A' | 'B' | null;
  generatedAt: number;
}
export interface MatchLogEntry {
  id: string;
  round: number;
  court: number;
  matchType: string;
  winners: string[];
  losers: string[];
  winnerSide: 'A' | 'B';
  finishedAt: string;
}
export interface RotationEvent {
  code: 'open';
  label: string;
  format: { id: 'openRotation' };
}
export interface TournamentStateV2 {
  schemaVersion: 2;
  players: Player[];
  currentRound: number;
  activeMatches: ActiveMatch[];
  matchLog: MatchLogEntry[];
  teammateHistory: Map<string, number>;
  events: RotationEvent[];
}
export interface SerializedTournamentStateV2
  extends Omit<TournamentStateV2, 'activeMatches' | 'teammateHistory'> {
  activeMatches: (Omit<ActiveMatch, 'sideA' | 'sideB'> & { sideA: string[]; sideB: string[] })[];
  teammateHistory: [string, number][];
}
export interface RoundConfig {
  matchType: MatchType;
  courtCount: number;
  teammateLimit: number;
}
export interface SuccessfulRoundPlan {
  ok: true;
  matches: ActiveMatch[];
  selectedPlayers: Player[];
  courtCount: number;
  reducedCourts: boolean;
  requestedCourtCount: number;
}
export type RoundPlan = SuccessfulRoundPlan | { ok: false; message: string };
export interface ShareCredentials {
  code: string;
  editToken: string;
}
