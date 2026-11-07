import type { MatchLogEntry, Player } from './types';
const LEVEL = { beginner: 1, intermediate: 2, pro: 3 };
export function winStreak(player: Player, history: MatchLogEntry[]): number {
  let streak = 0;
  for (const game of [...history].sort(
    (a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt),
  )) {
    if (game.winners.includes(player.name)) streak++;
    else if (game.losers.includes(player.name)) break;
  }
  return streak;
}
/** Skill dominates; a short record is shrunk toward neutral rather than treated as a rating. */
export function playerStrength(player: Player, history: MatchLogEntry[]): number {
  const form = ((player.wins + 2) / (player.wins + player.losses + 4) - 0.5) * 400;
  return LEVEL[player.skill] * 1000 + form + Math.min(5, winStreak(player, history)) * 35;
}
