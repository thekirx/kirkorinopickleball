import type {
  Player,
  Skill,
  ActiveMatch,
  TournamentStateV2,
  RoundConfig,
  RoundPlan,
  SuccessfulRoundPlan,
  MatchType,
} from './types';
export const SKILL_VALUES = { beginner: 1, intermediate: 2, pro: 3 };
export const SKILL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', pro: 'Pro' };
export const PLAYER_CHANGE_WINDOW_MS = 120000;
// State-scoped direct port: each store mutation passes a fresh, relinked draft.
export function createEngine(state: TournamentStateV2, random = Math.random) {
  function createId(prefix = 'item') {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${random().toString(16).slice(2)}`;
  }

  function shuffle(items: Player[]) {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }

    return copy;
  }

  function getPlayerById(playerId: string) {
    return state.players.find((player) => player.id === playerId);
  }

  function getPairKey(playerA: Player, playerB: Player) {
    return [playerA.id, playerB.id].sort().join('|');
  }

  function getTeammateCount(playerA: Player, playerB: Player) {
    return state.teammateHistory.get(getPairKey(playerA, playerB)) || 0;
  }

  function getWinRate(player: Player) {
    const totalMatches = player.wins + player.losses;
    return totalMatches === 0 ? 0 : (player.wins / totalMatches) * 100;
  }

  function getAssignedPlayerIds() {
    return new Set(
      state.activeMatches.flatMap((match) =>
        [...match.sideA, ...match.sideB].map((player) => player.id),
      ),
    );
  }

  function addPlayer(name: string, skill: Skill) {
    const cleanName = name.trim().replace(/\s+/g, ' ');

    if (!cleanName) {
      return { ok: false, message: 'Please enter a player name.' };
    }

    const duplicateExists = state.players.some(
      (player) => player.name.toLowerCase() === cleanName.toLowerCase(),
    );

    if (duplicateExists) {
      return { ok: false, message: 'That player is already in the roster.' };
    }

    state.players.push({
      id: createId('player'),
      name: cleanName,
      skill,
      roundsWaited: 0,
      wins: 0,
      losses: 0,
      lastPlayedRound: null,
      active: true,
    });

    return { ok: true, message: `${cleanName} was added to the roster.` };
  }

  function removePlayer(playerId: string) {
    const player = getPlayerById(playerId);
    if (!player) return;

    state.players = state.players.filter((item) => item.id !== playerId);

    // Remove any displayed court containing this player.
    state.activeMatches = state.activeMatches.filter((match) => {
      const matchPlayerIds = [...match.sideA, ...match.sideB].map((item) => item.id);
      return !matchPlayerIds.includes(playerId);
    });

    // Remove teammate-history records involving the deleted player.
    for (const pairKey of state.teammateHistory.keys()) {
      if (pairKey.split('|').includes(playerId)) {
        state.teammateHistory.delete(pairKey);
      }
    }
  }

  function updatePlayerRecord(playerId: string, stat: 'wins' | 'losses', amount: number) {
    const player = getPlayerById(playerId);
    if (!player || !['wins', 'losses'].includes(stat)) return;

    player[stat] = Math.max(0, player[stat] + amount);
  }

  function setPlayerActive(playerId: string, active: boolean) {
    const player = getPlayerById(playerId);
    if (!player) return { ok: false, message: 'Player not found.' };

    player.active = Boolean(active);
    return {
      ok: true,
      player,
      message: player.active
        ? `${player.name} is active and can join the queue again.`
        : `${player.name} is timed out and will not join the queue.`,
    };
  }

  function getPrioritizedQueue(players: Player[] = state.players) {
    const groupsByWait = new Map<number, Player[]>();

    players.forEach((player) => {
      if (!groupsByWait.has(player.roundsWaited)) {
        groupsByWait.set(player.roundsWaited, []);
      }
      groupsByWait.get(player.roundsWaited)!.push(player);
    });

    return [...groupsByWait.keys()]
      .sort((a, b) => b - a)
      .flatMap((roundsWaited) => shuffle(groupsByWait.get(roundsWaited)!));
  }

  function selectPriorityPlayers(requiredPlayerCount: number, players: Player[] = state.players) {
    return getPrioritizedQueue(players).slice(0, requiredPlayerCount);
  }

  function scoreSinglesLayout(matches: ActiveMatch[]) {
    return matches.reduce((score, match) => {
      return (
        score + Math.abs(SKILL_VALUES[match.sideA[0].skill] - SKILL_VALUES[match.sideB[0].skill])
      );
    }, 0);
  }

  function buildSinglesLayoutFromOrder(orderedPlayers: Player[]) {
    const matches: ActiveMatch[] = [];

    for (let index = 0; index < orderedPlayers.length; index += 2) {
      matches.push({
        id: createId('match'),
        sideA: [orderedPlayers[index]],
        sideB: [orderedPlayers[index + 1]],
        status: 'active',
        winnerSide: null,
        generatedAt: 0,
        courtId: '',
      });
    }

    return matches;
  }

  function buildRandomizedSinglesMatches(selectedPlayers: Player[]) {
    const candidates: { matches: ActiveMatch[]; score: number }[] = [];
    const attemptCount = Math.min(500, Math.max(80, selectedPlayers.length * 35));

    for (let attempt = 0; attempt < attemptCount; attempt += 1) {
      const matches = buildSinglesLayoutFromOrder(shuffle(selectedPlayers));
      candidates.push({ matches, score: scoreSinglesLayout(matches) });
    }

    candidates.sort((a, b) => a.score - b.score);
    const preferredPoolSize = Math.max(1, Math.ceil(candidates.length * 0.15));
    return candidates[Math.floor(random() * preferredPoolSize)].matches;
  }

  function isTeammatePairAllowed(team: Player[], teammateLimit: number) {
    if (teammateLimit === Infinity) return true;
    return getTeammateCount(team[0], team[1]) < teammateLimit;
  }

  function scoreDoublesLayout(matches: ActiveMatch[]) {
    return matches.reduce((score, match) => {
      const teamASkill = match.sideA.reduce(
        (total, player) => total + SKILL_VALUES[player.skill],
        0,
      );
      const teamBSkill = match.sideB.reduce(
        (total, player) => total + SKILL_VALUES[player.skill],
        0,
      );
      const allSkills = [...match.sideA, ...match.sideB].map(
        (player) => SKILL_VALUES[player.skill],
      );
      const teammateRepeatCost =
        getTeammateCount(match.sideA[0], match.sideA[1]) +
        getTeammateCount(match.sideB[0], match.sideB[1]);

      return (
        score +
        Math.abs(teamASkill - teamBSkill) * 5 +
        (Math.max(...allSkills) - Math.min(...allSkills)) +
        teammateRepeatCost * 2
      );
    }, 0);
  }

  function buildDoublesLayoutFromOrder(orderedPlayers: Player[], teammateLimit: number) {
    const matches: ActiveMatch[] = [];

    for (let index = 0; index < orderedPlayers.length; index += 4) {
      const sideA = [orderedPlayers[index], orderedPlayers[index + 1]];
      const sideB = [orderedPlayers[index + 2], orderedPlayers[index + 3]];

      if (
        !isTeammatePairAllowed(sideA, teammateLimit) ||
        !isTeammatePairAllowed(sideB, teammateLimit)
      ) {
        return null;
      }

      matches.push({
        id: createId('match'),
        sideA,
        sideB,
        status: 'active',
        winnerSide: null,
        generatedAt: 0,
        courtId: '',
      });
    }

    return matches;
  }

  function buildRandomizedDoublesMatches(selectedPlayers: Player[], teammateLimit: number) {
    const validCandidates: { matches: ActiveMatch[]; score: number }[] = [];
    const attemptCount = Math.min(6000, Math.max(1200, selectedPlayers.length * 260));

    for (let attempt = 0; attempt < attemptCount; attempt += 1) {
      const matches = buildDoublesLayoutFromOrder(shuffle(selectedPlayers), teammateLimit);
      if (!matches) continue;

      validCandidates.push({
        matches,
        score: scoreDoublesLayout(matches),
      });

      // Enough variety has been collected to choose unpredictably.
      if (validCandidates.length >= 180) break;
    }

    if (validCandidates.length === 0) return null;

    validCandidates.sort((a, b) => a.score - b.score);
    const preferredPoolSize = Math.max(1, Math.ceil(validCandidates.length * 0.2));
    return validCandidates[Math.floor(random() * preferredPoolSize)].matches;
  }

  function createRoundPlan(config: RoundConfig): RoundPlan {
    const playersPerCourt = config.matchType === 'singles' ? 2 : 4;
    const availablePlayers = state.players.filter((player) => player.active !== false);
    const maximumPossibleCourts = Math.floor(availablePlayers.length / playersPerCourt);
    const activeCourtCount = Math.min(config.courtCount, maximumPossibleCourts);

    if (activeCourtCount < 1) {
      return {
        ok: false,
        message: `You need at least ${playersPerCourt} active players for a ${config.matchType} match.`,
      };
    }

    const requiredPlayerCount = activeCourtCount * playersPerCourt;
    const selectedPlayers = selectPriorityPlayers(requiredPlayerCount, availablePlayers);
    const matches =
      config.matchType === 'singles'
        ? buildRandomizedSinglesMatches(selectedPlayers)
        : buildRandomizedDoublesMatches(selectedPlayers, config.teammateLimit);

    if (!matches) {
      return {
        ok: false,
        message:
          'The top-priority waiting group cannot be arranged without breaking the teammate-repeat limit. Increase the teammate limit, or complete another round with a different roster configuration.',
      };
    }

    return {
      ok: true,
      matches,
      selectedPlayers,
      courtCount: activeCourtCount,
      reducedCourts: activeCourtCount < config.courtCount,
      requestedCourtCount: config.courtCount,
    };
  }

  function recordGeneratedTeammates(matches: ActiveMatch[], matchType: MatchType) {
    if (matchType !== 'doubles') return;

    matches.forEach((match) => {
      [match.sideA, match.sideB].forEach((team) => {
        const pairKey = getPairKey(team[0], team[1]);
        state.teammateHistory.set(pairKey, getTeammateCount(team[0], team[1]) + 1);
      });
    });
  }

  function applyRoundPlan(
    roundPlan: SuccessfulRoundPlan,
    matchType: MatchType,
    generatedAt = Date.now(),
  ) {
    const selectedIds = new Set(roundPlan.selectedPlayers.map((player) => player.id));

    state.currentRound += 1;
    state.activeMatches = roundPlan.matches;
    state.activeMatches.forEach((match) => {
      match.generatedAt = generatedAt;
      match.courtId = `court-${match.id}`;
    });

    state.players.forEach((player) => {
      if (player.active === false) return;

      if (selectedIds.has(player.id)) {
        player.roundsWaited = 0;
        player.lastPlayedRound = state.currentRound;
      } else {
        player.roundsWaited += 1;
      }
    });

    recordGeneratedTeammates(roundPlan.matches, matchType);
  }

  function matchChangeTimeRemaining(match: ActiveMatch, now = Date.now()) {
    return Math.max(0, PLAYER_CHANGE_WINDOW_MS - (now - match.generatedAt));
  }

  function canChangeMatchPlayer(match: ActiveMatch, now = Date.now()) {
    return match.status !== 'finished' && matchChangeTimeRemaining(match, now) > 0;
  }

  function getReplacementCandidates(excludedPlayerId: string | null = null) {
    const assignedIds = getAssignedPlayerIds();

    return state.players
      .filter(
        (player) =>
          player.id !== excludedPlayerId && player.active !== false && !assignedIds.has(player.id),
      )
      .sort((a, b) => b.roundsWaited - a.roundsWaited || a.name.localeCompare(b.name));
  }

  function adjustTeammateHistory(playerA: Player | null, playerB: Player | null, amount: number) {
    if (!playerA || !playerB) return;

    const pairKey = getPairKey(playerA, playerB);
    const nextCount = Math.max(0, getTeammateCount(playerA, playerB) + amount);

    if (nextCount === 0) {
      state.teammateHistory.delete(pairKey);
    } else {
      state.teammateHistory.set(pairKey, nextCount);
    }
  }

  function replaceMatchPlayer(
    matchId: string,
    outgoingPlayerId: string,
    replacementPlayerId: string,
    now = Date.now(),
    reason: 'standard' | 'injury' = 'standard',
  ) {
    const match = state.activeMatches.find((item) => item.id === matchId);
    if (!match || match.status === 'finished') {
      return {
        ok: false,
        reason: 'match-unavailable',
        message: 'This match can no longer be changed.',
      };
    }

    if (reason !== 'injury' && !canChangeMatchPlayer(match, now)) {
      return {
        ok: false,
        reason: 'change-window-expired',
        message:
          'The two-minute player-change window has closed. Use injury substitution if needed.',
      };
    }

    const outgoingPlayer = getPlayerById(outgoingPlayerId);
    const replacementPlayer = getPlayerById(replacementPlayerId);
    const side = match.sideA.some((player) => player.id === outgoingPlayerId)
      ? match.sideA
      : match.sideB.some((player) => player.id === outgoingPlayerId)
        ? match.sideB
        : null;

    if (!side || !outgoingPlayer) {
      return {
        ok: false,
        reason: 'player-not-in-match',
        message: 'That player is not assigned to this match.',
      };
    }

    const validReplacement = getReplacementCandidates(outgoingPlayerId).some(
      (player) => player.id === replacementPlayerId,
    );

    if (!replacementPlayer || !validReplacement) {
      return {
        ok: false,
        reason: 'replacement-unavailable',
        message: 'Choose an active player who is waiting.',
      };
    }

    const outgoingIndex = side.findIndex((player) => player.id === outgoingPlayerId);
    const teammate = side.length === 2 ? side[1 - outgoingIndex] : null;

    adjustTeammateHistory(outgoingPlayer, teammate, -1);
    side[outgoingIndex] = replacementPlayer;
    adjustTeammateHistory(replacementPlayer, teammate, 1);

    replacementPlayer.roundsWaited = 0;
    replacementPlayer.lastPlayedRound = state.currentRound;

    if (reason === 'injury') {
      outgoingPlayer.active = false;
    } else {
      outgoingPlayer.roundsWaited += 1;
    }

    return {
      ok: true,
      outgoingPlayer,
      replacement: replacementPlayer,
      message: `${replacementPlayer.name} replaced ${outgoingPlayer.name}.`,
    };
  }

  function substituteInjuredPlayer(matchId: string, injuredPlayerId: string, now = Date.now()) {
    const injuredPlayer = getPlayerById(injuredPlayerId);
    if (!injuredPlayer) {
      return { ok: false, reason: 'player-not-found', message: 'Player not found.' };
    }

    const replacement = getReplacementCandidates(injuredPlayerId).sort((a, b) => {
      const skillDifference =
        Math.abs(SKILL_VALUES[a.skill] - SKILL_VALUES[injuredPlayer.skill]) -
        Math.abs(SKILL_VALUES[b.skill] - SKILL_VALUES[injuredPlayer.skill]);
      return skillDifference || b.roundsWaited - a.roundsWaited || a.name.localeCompare(b.name);
    })[0];

    if (!replacement) {
      return {
        ok: false,
        reason: 'no-replacement',
        message: 'No active waiting player is available as an injury substitute.',
      };
    }

    return replaceMatchPlayer(matchId, injuredPlayerId, replacement.id, now, 'injury');
  }

  function declareWinner(matchId: string, winningSide: 'A' | 'B') {
    const match = state.activeMatches.find((item) => item.id === matchId);
    if (!match || match.status === 'finished') return;

    const winners = winningSide === 'A' ? match.sideA : match.sideB;
    const losers = winningSide === 'A' ? match.sideB : match.sideA;

    winners.forEach((playerReference) => {
      const player = getPlayerById(playerReference.id);
      if (player) player.wins += 1;
    });

    losers.forEach((playerReference) => {
      const player = getPlayerById(playerReference.id);
      if (player) player.losses += 1;
    });

    match.status = 'finished';
    match.winnerSide = winningSide;

    state.matchLog.unshift({
      id: match.id,
      round: state.currentRound,
      court: state.activeMatches.indexOf(match) + 1,
      matchType: match.sideA.length === 2 ? 'Doubles' : 'Singles',
      winners: winners.map((player) => player.name),
      losers: losers.map((player) => player.name),
      winnerSide: winningSide,
      finishedAt: new Date().toISOString(),
    });

    return {
      ok: true,
      message: `Court ${state.activeMatches.indexOf(match) + 1} finished. Results and leaderboard updated.`,
    };
  }

  // PROTOTYPE (easy mode): skill can be set after a player is added.
  function setPlayerSkill(playerId: string, skill: Skill) {
    const player = getPlayerById(playerId);
    if (!player || !(skill in SKILL_VALUES)) return { ok: false, message: 'Player not found.' };
    player.skill = skill;
    return { ok: true, message: `${player.name} is now ${SKILL_LABELS[skill]}.` };
  }

  // PROTOTYPE (easy mode): drag-and-drop / tap-to-swap. One rule set for every
  // input path, so drag, tap and the Swap panel can never disagree.
  function locatePlayer(playerId: string) {
    for (let court = 0; court < state.activeMatches.length; court += 1) {
      const match = state.activeMatches[court];
      for (const side of [match.sideA, match.sideB]) {
        const index = side.findIndex((p) => p.id === playerId);
        if (index >= 0) return { match, side, index, court: court + 1 };
      }
    }
    return null;
  }

  /** Why these two can't swap, in plain words; null when they can. */
  function swapBlockReason(aId: string, bId: string, now = Date.now()): string | null {
    const a = getPlayerById(aId);
    const b = getPlayerById(bId);
    if (!a || !b) return 'Player not found.';
    if (aId === bId) return 'Pick someone else to swap with.';
    const la = locatePlayer(aId);
    const lb = locatePlayer(bId);
    if (!la && !lb) return 'Both are sitting out, so there is nothing to swap.';
    for (const loc of [la, lb]) {
      if (!loc) continue;
      if (loc.match.status === 'finished') return `Court ${loc.court} has finished.`;
      if (!canChangeMatchPlayer(loc.match, now))
        return `Court ${loc.court} started over 2 minutes ago. Use "Got hurt" for injuries.`;
    }
    if (la && lb && la.side === lb.side) return 'They are already on the same team.';
    for (const [loc, player] of [
      [la, a],
      [lb, b],
    ] as const) {
      if (!loc && player.active === false) return `${player.name} is on a break.`;
    }
    return null;
  }

  function swapPlayers(aId: string, bId: string, now = Date.now()) {
    const reason = swapBlockReason(aId, bId, now);
    if (reason) return { ok: false, message: reason };
    const a = getPlayerById(aId)!;
    const b = getPlayerById(bId)!;
    const la = locatePlayer(aId);
    const lb = locatePlayer(bId);
    const sides = new Set([la?.side, lb?.side].filter(Boolean) as Player[][]);
    const pairs = (delta: number) =>
      sides.forEach((side) => {
        if (side.length === 2) adjustTeammateHistory(side[0], side[1], delta);
      });
    pairs(-1);
    if (la) la.side[la.index] = b;
    if (lb) lb.side[lb.index] = a;
    pairs(1);
    // Moving between a court and the sitting-out line follows the same
    // bookkeeping as a standard substitution.
    const incoming = !la ? a : !lb ? b : null;
    const outgoing = !la ? b : !lb ? a : null;
    if (incoming && outgoing) {
      incoming.roundsWaited = 0;
      incoming.lastPlayedRound = state.currentRound;
      outgoing.roundsWaited += 1;
      return { ok: true, message: `${incoming.name} is in for ${outgoing.name}.` };
    }
    return { ok: true, message: `${a.name} and ${b.name} swapped places.` };
  }

  // PROTOTYPE (easy mode): organizer option for family-and-friends play. A late
  // arrival jumps ahead of everyone already waiting so they play next round.
  // Other late arrivals from the same round are ignored when finding the level
  // to beat, so they share it (shuffled) instead of each newcomer leapfrogging
  // the previous one.
  function prioritizeForNextRound(playerId: string, sameRoundArrivals: string[] = []) {
    const player = getPlayerById(playerId);
    if (!player) return { ok: false, message: 'Player not found.' };
    const ignore = new Set([playerId, ...sameRoundArrivals]);
    const level = state.players
      .filter((p) => p.active !== false && !ignore.has(p.id))
      .reduce((max, p) => Math.max(max, p.roundsWaited), 0);
    player.roundsWaited = level + 1;
    return { ok: true, message: `${player.name} will play in the next round.` };
  }

  // PROTOTYPE (easy mode): a mis-tapped winner must be fixable. Reverses the
  // win/loss counts and removes the match-log entry, so declaring again (for
  // either side) produces exactly one correct record.
  function clearResult(matchId: string) {
    const match = state.activeMatches.find((item) => item.id === matchId);
    if (!match || match.status !== 'finished' || !match.winnerSide) return;
    const winners = match.winnerSide === 'A' ? match.sideA : match.sideB;
    const losers = match.winnerSide === 'A' ? match.sideB : match.sideA;
    winners.forEach((ref) => {
      const player = getPlayerById(ref.id);
      if (player) player.wins = Math.max(0, player.wins - 1);
    });
    losers.forEach((ref) => {
      const player = getPlayerById(ref.id);
      if (player) player.losses = Math.max(0, player.losses - 1);
    });
    state.matchLog = state.matchLog.filter((entry) => entry.id !== match.id);
    match.status = 'active';
    match.winnerSide = null;
    return { ok: true, message: `Court ${state.activeMatches.indexOf(match) + 1} result cleared.` };
  }

  function getRankedPlayers() {
    return [...state.players].sort((a, b) => {
      const winsDifference = b.wins - a.wins;
      if (winsDifference !== 0) return winsDifference;

      const winRateDifference = getWinRate(b) - getWinRate(a);
      if (Math.abs(winRateDifference) > 0.0001) return winRateDifference;

      const lossesDifference = a.losses - b.losses;
      if (lossesDifference !== 0) return lossesDifference;

      return a.name.localeCompare(b.name);
    });
  }
  return {
    createId,
    shuffle,
    getPlayerById,
    getPairKey,
    getTeammateCount,
    getWinRate,
    getAssignedPlayerIds,
    addPlayer,
    removePlayer,
    updatePlayerRecord,
    setPlayerActive,
    getPrioritizedQueue,
    selectPriorityPlayers,
    scoreSinglesLayout,
    buildSinglesLayoutFromOrder,
    buildRandomizedSinglesMatches,
    isTeammatePairAllowed,
    scoreDoublesLayout,
    buildDoublesLayoutFromOrder,
    buildRandomizedDoublesMatches,
    createRoundPlan,
    recordGeneratedTeammates,
    applyRoundPlan,
    matchChangeTimeRemaining,
    canChangeMatchPlayer,
    getReplacementCandidates,
    adjustTeammateHistory,
    replaceMatchPlayer,
    substituteInjuredPlayer,
    declareWinner,
    setPlayerSkill,
    prioritizeForNextRound,
    swapBlockReason,
    swapPlayers,
    clearResult,
    getRankedPlayers,
  };
}
