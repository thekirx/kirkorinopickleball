"use strict";

const STORAGE_KEY = "kirq-session-v2";
const SKILL_VALUES = { beginner: 1, intermediate: 2, advanced: 3 };
const SKILL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

const state = {
  players: [],
  currentRound: 0,
  activeMatches: [],
  matchHistory: [],
  teammateHistory: new Map(),
  sessionName: "Tuesday Night Rally",
  matchType: "doubles",
  skillMatching: "mixed",
  courtCount: 2,
  teammateLimit: 2
};

const elements = {
  headerSessionName: document.querySelector("#header-session-name"),
  headerPlayerCount: document.querySelector("#header-player-count"),
  headerCourtCount: document.querySelector("#header-court-count"),
  sessionSummaryCopy: document.querySelector("#session-summary-copy"),
  dashboardTitle: document.querySelector("#dashboard-title"),
  summaryActive: document.querySelector("#summary-active"),
  summaryPlaying: document.querySelector("#summary-playing"),
  summaryWaiting: document.querySelector("#summary-waiting"),
  summaryCourts: document.querySelector("#summary-courts"),
  summaryRound: document.querySelector("#summary-round"),
  playingDetail: document.querySelector("#playing-detail"),
  waitingDetail: document.querySelector("#waiting-detail"),
  courtDetail: document.querySelector("#court-detail"),
  roundDetail: document.querySelector("#round-detail"),
  courtsRoundLabel: document.querySelector("#courts-round-label"),
  courtsGrid: document.querySelector("#courts-grid"),
  upNextList: document.querySelector("#up-next-list"),
  queueList: document.querySelector("#queue-list"),
  queueCount: document.querySelector("#queue-count"),
  playerForm: document.querySelector("#player-form"),
  playerName: document.querySelector("#player-name"),
  avatarPreview: document.querySelector("#avatar-preview"),
  playerFormError: document.querySelector("#player-form-error"),
  generateRound: document.querySelector("#generate-round"),
  generateHelp: document.querySelector("#generate-help"),
  loadDemo: document.querySelector("#load-demo"),
  rosterCount: document.querySelector("#roster-count"),
  removeAllPlayers: document.querySelector("#remove-all-players"),
  playersBody: document.querySelector("#players-body"),
  playersCards: document.querySelector("#players-cards"),
  leaderboardBody: document.querySelector("#leaderboard-body"),
  matchHistoryList: document.querySelector("#match-history-list"),
  emptySessionGuide: document.querySelector("#empty-session-guide"),
  emptyAddPlayer: document.querySelector("#empty-add-player"),
  workflowStep: document.querySelector("#workflow-step"),
  workflowTitle: document.querySelector("#workflow-title"),
  workflowGuidance: document.querySelector("#workflow-guidance"),
  workflowAction: document.querySelector("#workflow-action"),
  mobileContextAction: document.querySelector("#mobile-context-action"),
  globalMessage: document.querySelector("#global-message"),
  settingsOverlay: document.querySelector("#settings-overlay"),
  openSettings: document.querySelector("#open-settings"),
  editSettings: document.querySelector("#edit-settings"),
  closeSettings: document.querySelector("#close-settings"),
  saveSettings: document.querySelector("#save-settings"),
  sessionName: document.querySelector("#session-name"),
  courtCount: document.querySelector("#court-count"),
  teammateLimit: document.querySelector("#teammate-limit"),
  resetSession: document.querySelector("#reset-session"),
  confirmOverlay: document.querySelector("#confirm-overlay"),
  confirmTitle: document.querySelector("#confirm-title"),
  confirmCopy: document.querySelector("#confirm-copy"),
  confirmCancel: document.querySelector("#confirm-cancel"),
  confirmAction: document.querySelector("#confirm-action")
};

let toastTimer;
let pendingConfirmation = null;
let settingsScrollY = 0;

function createId(prefix = "item") {
  return window.crypto?.randomUUID
    ? `${prefix}-${window.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getPlayerById(playerId) {
  return state.players.find((player) => player.id === playerId);
}

function getActivePlayers() {
  return state.players.filter((player) => player.active);
}

function getAssignedPlayerIds() {
  return new Set(state.activeMatches
    .filter((match) => match.status !== "finished")
    .flatMap((match) => [...match.sideA, ...match.sideB].map((player) => player.id)));
}

function getPlayingPlayerIds() {
  return new Set(state.activeMatches
    .filter((match) => match.status === "active")
    .flatMap((match) => [...match.sideA, ...match.sideB].map((player) => player.id)));
}

function getPairKey(playerA, playerB) {
  return [playerA.id, playerB.id].sort().join("|");
}

function getTeammateCount(playerA, playerB) {
  return state.teammateHistory.get(getPairKey(playerA, playerB)) || 0;
}

function getWinRate(player) {
  const games = player.wins + player.losses;
  return games ? (player.wins / games) * 100 : 0;
}

function saveState() {
  const payload = { ...state, teammateHistory: [...state.teammateHistory.entries()] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.players)) return;
    Object.assign(state, saved);
    state.players = saved.players.map((player) => ({ active: true, streak: 0, ...player }));
    state.activeMatches = (saved.activeMatches || []).map((match) => ({ startedAt: Date.now(), ...match }));
    state.matchHistory = saved.matchHistory || [];
    state.skillMatching = saved.skillMatching || "mixed";
    state.teammateHistory = new Map(saved.teammateHistory || []);
  } catch (error) {
    console.warn("KirQ could not restore the previous session.", error);
  }
}

function showToast(message, type = "success") {
  clearTimeout(toastTimer);
  elements.globalMessage.textContent = message;
  elements.globalMessage.className = `toast show${type === "error" ? " error" : ""}`;
  toastTimer = setTimeout(() => { elements.globalMessage.className = "toast"; }, 3200);
}

function showConfirmation({ title, copy, actionLabel = "Confirm", onConfirm }) {
  pendingConfirmation = onConfirm;
  elements.confirmTitle.textContent = title;
  elements.confirmCopy.textContent = copy;
  elements.confirmAction.textContent = actionLabel;
  elements.confirmOverlay.hidden = false;
  elements.confirmAction.focus();
}

function closeConfirmation() {
  elements.confirmOverlay.hidden = true;
  pendingConfirmation = null;
}

function emptyState(icon, title, copy) {
  return `<div class="empty-state"><span aria-hidden="true">${icon}</span><strong>${title}</strong><p>${copy}</p></div>`;
}

function addPlayer(name, skill) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  if (!cleanName) return { ok: false, message: "Enter a player name to continue." };
  if (state.players.some((player) => player.name.toLowerCase() === cleanName.toLowerCase())) {
    return { ok: false, message: "That player is already on the roster." };
  }
  state.players.push({
    id: createId("player"), name: cleanName, skill, roundsWaited: 0,
    wins: 0, losses: 0, streak: 0, lastPlayedRound: null, active: true
  });
  saveState();
  return { ok: true, message: `${cleanName} joined the session.` };
}

function removePlayer(playerId) {
  const player = getPlayerById(playerId);
  if (!player) return;
  showConfirmation({
    title: `Remove ${player.name}?`,
    copy: "Their session stats and queue position will be removed. This cannot be undone.",
    actionLabel: "Remove player",
    onConfirm: () => {
      state.players = state.players.filter((item) => item.id !== playerId);
      state.activeMatches = state.activeMatches.filter((match) =>
        ![...match.sideA, ...match.sideB].some((item) => item.id === playerId));
      for (const key of state.teammateHistory.keys()) {
        if (key.split("|").includes(playerId)) state.teammateHistory.delete(key);
      }
      saveState(); renderAll(); closeConfirmation(); showToast(`${player.name} was removed.`);
    }
  });
}

function editPlayer(playerId) {
  const player = getPlayerById(playerId);
  if (!player) return;
  const nextName = window.prompt("Edit player name", player.name);
  if (nextName === null) return;
  const cleanName = nextName.trim().replace(/\s+/g, " ");
  if (!cleanName) return showToast("Player name cannot be empty.", "error");
  if (state.players.some((item) => item.id !== playerId && item.name.toLowerCase() === cleanName.toLowerCase())) {
    return showToast("That name is already on the roster.", "error");
  }
  player.name = cleanName;
  saveState(); renderAll(); showToast("Player details updated.");
}

function togglePlayer(playerId) {
  const player = getPlayerById(playerId);
  if (!player) return;
  const isPlaying = getAssignedPlayerIds().has(playerId);
  if (isPlaying && player.active) return showToast("End the player's live match before marking them inactive.", "error");
  player.active = !player.active;
  saveState(); renderAll(); showToast(`${player.name} is now ${player.active ? "active" : "inactive"}.`);
}

function getPrioritizedQueue(players = getActivePlayers()) {
  const groups = new Map();
  players.forEach((player) => {
    if (!groups.has(player.roundsWaited)) groups.set(player.roundsWaited, []);
    groups.get(player.roundsWaited).push(player);
  });
  return [...groups.keys()].sort((a, b) => b - a).flatMap((wait) => shuffle(groups.get(wait)));
}

function getSameSkillBatches(playersPerCourt, maximumCourts = state.courtCount, randomizeTies = true) {
  const skillGroups = Object.keys(SKILL_LABELS).map((skill) => {
    const players = getActivePlayers().filter((player) => player.skill === skill);
    return randomizeTies
      ? getPrioritizedQueue(players)
      : players.sort((a, b) => b.roundsWaited - a.roundsWaited || a.name.localeCompare(b.name));
  });
  const batches = [];

  skillGroups.forEach((players) => {
    for (let index = 0; index + playersPerCourt <= players.length; index += playersPerCourt) {
      const group = players.slice(index, index + playersPerCourt);
      batches.push({
        players: group,
        highestWait: Math.max(...group.map((player) => player.roundsWaited)),
        totalWait: group.reduce((total, player) => total + player.roundsWaited, 0)
      });
    }
  });

  return batches
    .sort((a, b) => b.highestWait - a.highestWait || b.totalWait - a.totalWait)
    .slice(0, maximumCourts)
    .map((batch) => batch.players);
}

function getSkillEligibility(playersPerCourt) {
  const counts = Object.keys(SKILL_LABELS).map((skill) => ({
    skill,
    count: getActivePlayers().filter((player) => player.skill === skill).length
  }));
  const strongestGroup = counts.sort((a, b) => b.count - a.count)[0];
  return {
    eligible: state.skillMatching === "mixed" ? getActivePlayers().length >= playersPerCourt : strongestGroup.count >= playersPerCourt,
    strongestGroup,
    needed: Math.max(0, playersPerCourt - (state.skillMatching === "mixed" ? getActivePlayers().length : strongestGroup.count))
  };
}

function scoreSinglesLayout(matches) {
  return matches.reduce((score, match) => score + Math.abs(
    SKILL_VALUES[match.sideA[0].skill] - SKILL_VALUES[match.sideB[0].skill]), 0);
}

function scoreDoublesLayout(matches) {
  return matches.reduce((score, match) => {
    const a = match.sideA.reduce((total, player) => total + SKILL_VALUES[player.skill], 0);
    const b = match.sideB.reduce((total, player) => total + SKILL_VALUES[player.skill], 0);
    const spread = [...match.sideA, ...match.sideB].map((player) => SKILL_VALUES[player.skill]);
    const repeatCost = getTeammateCount(match.sideA[0], match.sideA[1]) + getTeammateCount(match.sideB[0], match.sideB[1]);
    return score + Math.abs(a - b) * 5 + Math.max(...spread) - Math.min(...spread) + repeatCost * 2;
  }, 0);
}

function buildSinglesMatches(selectedPlayers) {
  const candidates = [];
  for (let attempt = 0; attempt < Math.max(80, selectedPlayers.length * 30); attempt += 1) {
    const order = shuffle(selectedPlayers);
    const matches = [];
    for (let index = 0; index < order.length; index += 2) {
      matches.push({ id: createId("match"), sideA: [order[index]], sideB: [order[index + 1]], status: "ready", winnerSide: null, startedAt: null });
    }
    candidates.push({ matches, score: scoreSinglesLayout(matches) });
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates[Math.floor(Math.random() * Math.max(1, Math.ceil(candidates.length * .15)))].matches;
}

function buildDoublesMatches(selectedPlayers) {
  const candidates = [];
  const limit = state.teammateLimit === "unlimited" ? Infinity : Number(state.teammateLimit);
  for (let attempt = 0; attempt < Math.max(1200, selectedPlayers.length * 240); attempt += 1) {
    const order = shuffle(selectedPlayers);
    const matches = [];
    let valid = true;
    for (let index = 0; index < order.length; index += 4) {
      const sideA = [order[index], order[index + 1]];
      const sideB = [order[index + 2], order[index + 3]];
      if (getTeammateCount(sideA[0], sideA[1]) >= limit || getTeammateCount(sideB[0], sideB[1]) >= limit) { valid = false; break; }
      matches.push({ id: createId("match"), sideA, sideB, status: "ready", winnerSide: null, startedAt: null });
    }
    if (valid) candidates.push({ matches, score: scoreDoublesLayout(matches) });
    if (candidates.length >= 180) break;
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.score - b.score);
  return candidates[Math.floor(Math.random() * Math.max(1, Math.ceil(candidates.length * .2)))].matches;
}

function generateRound() {
  const playersPerCourt = state.matchType === "singles" ? 2 : 4;
  const activePlayers = getActivePlayers();
  const eligibility = getSkillEligibility(playersPerCourt);
  if (!eligibility.eligible) {
    const message = state.skillMatching === "same"
      ? `Same Skill Only needs ${playersPerCourt} players in one tier. Add ${eligibility.needed} more ${SKILL_LABELS[eligibility.strongestGroup.skill].toLowerCase()} player${eligibility.needed === 1 ? "" : "s"}, or switch to Mixed Skills.`
      : `Add at least ${playersPerCourt} active players first.`;
    return showToast(message, "error");
  }
  const courtCount = Math.min(state.courtCount, Math.floor(activePlayers.length / playersPerCourt));
  if (state.activeMatches.some((match) => match.status !== "finished")) {
    return showConfirmation({
      title: "Replace live matches?",
      copy: "Some courts are assigned or still live. Generating a new round will end those matches without recording results.",
      actionLabel: "Generate round",
      onConfirm: () => { closeConfirmation(); createAndApplyRound(courtCount, playersPerCourt); }
    });
  }
  createAndApplyRound(courtCount, playersPerCourt);
}

function createAndApplyRound(courtCount, playersPerCourt) {
  const sameSkillBatches = state.skillMatching === "same" ? getSameSkillBatches(playersPerCourt, courtCount) : null;
  const selected = sameSkillBatches
    ? sameSkillBatches.flat()
    : getPrioritizedQueue().slice(0, courtCount * playersPerCourt);
  const matchBuilder = state.matchType === "singles" ? buildSinglesMatches : buildDoublesMatches;
  const sameSkillMatches = sameSkillBatches?.map((players) => matchBuilder(players));
  const matches = sameSkillMatches
    ? sameSkillMatches.some((skillMatches) => !skillMatches)
      ? null
      : sameSkillMatches.flat()
    : matchBuilder(selected);
  if (!matches) {
    return showToast("The priority group cannot meet the teammate-repeat limit. Increase the limit in settings.", "error");
  }
  if (!matches.length) {
    return showToast(`No ${state.matchType} court can be filled within one skill level yet.`, "error");
  }
  state.currentRound += 1;
  state.activeMatches = matches;
  const selectedIds = new Set(selected.map((player) => player.id));
  getActivePlayers().forEach((player) => {
    if (selectedIds.has(player.id)) { player.roundsWaited = 0; player.lastPlayedRound = state.currentRound; }
    else player.roundsWaited += 1;
  });
  if (state.matchType === "doubles") {
    matches.forEach((match) => [match.sideA, match.sideB].forEach((team) => {
      const key = getPairKey(team[0], team[1]);
      state.teammateHistory.set(key, getTeammateCount(team[0], team[1]) + 1);
    }));
  }
  saveState(); renderAll();
  document.querySelector("#courts").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast(`Round ${state.currentRound} is ready. Confirm each court to start play.`);
}

function startMatch(matchId) {
  const match = state.activeMatches.find((item) => item.id === matchId);
  if (!match || match.status !== "ready") return;
  match.status = "active";
  match.startedAt = Date.now();
  saveState(); renderAll();
  showToast("Match started. Record the winning team when play finishes.");
}

function declareWinner(matchId, side) {
  const match = state.activeMatches.find((item) => item.id === matchId);
  if (!match || match.status !== "active") return;
  const winners = side === "A" ? match.sideA : match.sideB;
  const losers = side === "A" ? match.sideB : match.sideA;
  winners.forEach((reference) => { const player = getPlayerById(reference.id); if (player) { player.wins += 1; player.streak = Math.max(1, player.streak + 1); } });
  losers.forEach((reference) => { const player = getPlayerById(reference.id); if (player) { player.losses += 1; player.streak = Math.min(-1, player.streak - 1); } });
  match.status = "finished";
  match.winnerSide = side;
  match.finishedAt = Date.now();
  state.matchHistory.unshift({
    id: match.id,
    round: state.currentRound,
    court: state.activeMatches.indexOf(match) + 1,
    sideA: match.sideA.map((player) => ({ id: player.id, name: player.name })),
    sideB: match.sideB.map((player) => ({ id: player.id, name: player.name })),
    winnerSide: side,
    startedAt: match.startedAt,
    finishedAt: match.finishedAt
  });
  saveState(); renderAll(); showToast(`${winners.map((player) => player.name).join(" & ")} took the win.`);
}

function endMatch(matchId) {
  const matchIndex = state.activeMatches.findIndex((match) => match.id === matchId);
  if (matchIndex < 0) return;
  showConfirmation({
    title: "Clear this court?", copy: "The match will end without changing player records.", actionLabel: "Clear court",
    onConfirm: () => { state.activeMatches.splice(matchIndex, 1); saveState(); renderAll(); closeConfirmation(); showToast("Court is now available."); }
  });
}

function getPlayerStatus(player, assignedIds, nextIds) {
  if (!player.active) return { label: "Inactive", className: "inactive" };
  if (assignedIds.has(player.id)) {
    const match = state.activeMatches.find((item) =>
      item.status !== "finished" && [...item.sideA, ...item.sideB].some((member) => member.id === player.id));
    return match?.status === "ready"
      ? { label: "Assigned to Court", className: "assigned" }
      : { label: "Playing", className: "playing" };
  }
  if (nextIds.has(player.id)) return { label: "Eligible Next", className: "next" };
  return { label: "Waiting", className: "waiting" };
}

function getWaitingPlayers() {
  const assigned = getAssignedPlayerIds();
  return getActivePlayers().filter((player) => !assigned.has(player.id))
    .sort((a, b) => b.roundsWaited - a.roundsWaited || a.name.localeCompare(b.name));
}

function getNextPlayers() {
  const perCourt = state.matchType === "singles" ? 2 : 4;
  if (state.skillMatching === "same") {
    return getSameSkillBatches(perCourt, 1, false)[0] || [];
  }
  return getWaitingPlayers().slice(0, perCourt);
}

function playerMarkup(player) {
  return `<div class="team-player"><span class="avatar">${initials(player.name)}</span><div><strong>${escapeHtml(player.name)}</strong><span class="skill-badge">${SKILL_LABELS[player.skill]}</span></div></div>`;
}

function renderSummary() {
  const activePlayers = getActivePlayers();
  const assigned = getAssignedPlayerIds();
  const playing = getPlayingPlayerIds();
  const waiting = activePlayers.filter((player) => !assigned.has(player.id));
  const liveCourts = state.activeMatches.filter((match) => match.status === "active").length;
  const availableCourts = Math.max(0, state.courtCount - liveCourts);
  elements.headerSessionName.textContent = state.sessionName;
  elements.headerPlayerCount.textContent = activePlayers.length;
  elements.headerCourtCount.textContent = state.courtCount;
  elements.summaryActive.textContent = activePlayers.length;
  elements.summaryPlaying.textContent = playing.size;
  elements.summaryWaiting.textContent = waiting.length;
  elements.summaryCourts.textContent = state.courtCount;
  elements.summaryRound.textContent = String(state.currentRound).padStart(2, "0");
  elements.dashboardTitle.textContent = state.sessionName;
  elements.playingDetail.textContent = liveCourts ? `${liveCourts} live court${liveCourts === 1 ? "" : "s"}` : "No live matches";
  elements.waitingDetail.textContent = waiting.length ? `${waiting[0].roundsWaited} round max wait` : "Queue is clear";
  elements.courtDetail.textContent = `${availableCourts} available`;
  elements.roundDetail.textContent = state.currentRound ? "Session in motion" : "Ready when you are";
  const limit = state.teammateLimit === "unlimited" ? "Unlimited Repeat Teammates" : `Maximum ${state.teammateLimit} Repeat Teammate${Number(state.teammateLimit) === 1 ? "" : "s"}`;
  const skillMode = state.skillMatching === "same" ? "Same Skill Only" : "Mixed Skills";
  elements.sessionSummaryCopy.textContent = `${state.matchType === "doubles" ? "Doubles" : "Singles"} · ${skillMode} · ${state.courtCount} Court${state.courtCount === 1 ? "" : "s"} · ${limit}`;
}

function renderCourts() {
  elements.courtsGrid.innerHTML = "";
  elements.courtsRoundLabel.textContent = state.currentRound ? `Round ${state.currentRound}` : "No round yet";
  state.activeMatches.forEach((match, index) => {
    const isFinished = match.status === "finished";
    const isReady = match.status === "ready";
    const isDoubles = match.sideA.length === 2;
    const statusLabel = isFinished ? "✓ Finished" : isReady ? "◆ Match Ready" : "● Live · Assigned to Court";
    const teamButton = (side) => {
      if (isReady) return "";
      const isWinner = match.winnerSide === side;
      return `<button class="win-button record-winner${isWinner ? " winner" : ""}" data-win="${side}" data-match-id="${match.id}" ${isFinished ? "disabled" : ""}>${isWinner ? "✓ Winner recorded" : `Record Team ${side} Winner`}</button>`;
    };
    elements.courtsGrid.insertAdjacentHTML("beforeend", `
      <article class="court-card${isFinished ? " finished" : ""}${isReady ? " match-ready" : ""}">
        <header class="court-heading"><div class="court-number"><span>${index + 1}</span><div><h3>Court ${index + 1}</h3><small>${isDoubles ? "Doubles" : "Singles"} · Round ${state.currentRound}</small></div></div><span class="status-badge${isFinished ? " finished" : isReady ? " ready" : ""}">${statusLabel}</span></header>
        <div class="match-content">
          <div class="team"><span class="team-label">${isDoubles ? "Team A" : "Player A"}</span>${match.sideA.map(playerMarkup).join("")}${teamButton("A")}</div>
          <span class="versus">VS</span>
          <div class="team"><span class="team-label">${isDoubles ? "Team B" : "Player B"}</span>${match.sideB.map(playerMarkup).join("")}${teamButton("B")}</div>
        </div>
        <footer class="match-footer">
          <span class="match-timer" ${match.startedAt ? `data-started-at="${match.startedAt}" data-finished-at="${match.finishedAt || ""}"` : ""}>${isReady ? "Players assigned · Confirm to begin" : "00:00 on court"}</span>
          ${isReady ? `<button class="button button-primary start-match" type="button" data-start-match="${match.id}">Start Match</button>` : `<button type="button" data-end-match="${match.id}">${isFinished ? "Clear court" : "End match"}</button>`}
        </footer>
      </article>`);
  });

  const availableCount = Math.max(0, state.courtCount - state.activeMatches.length);
  if (availableCount > 0) {
    elements.courtsGrid.insertAdjacentHTML("beforeend", `<article class="court-card available compact-available"><div class="empty-court-content"><span>＋</span><h3>${availableCount} court${availableCount === 1 ? "" : "s"} available</h3><p>Ready for the next fair matchup.</p></div></article>`);
  }
  updateMatchTimers();
}

function renderUpNext() {
  const players = getNextPlayers();
  if (!players.length) {
    elements.upNextList.innerHTML = `<p class="next-empty">${state.players.length ? state.skillMatching === "same" ? "No single skill tier can fill a court yet. Add more players in one tier or choose Mixed Skills." : "Add or activate more waiting players to build the next group." : "Add players to start building your fair queue."}</p>`;
    return;
  }
  elements.upNextList.innerHTML = players.map((player) => `<article class="next-player"><span class="avatar">${initials(player.name)}</span><div><strong>${escapeHtml(player.name)}</strong><small>${SKILL_LABELS[player.skill]} · Waited ${player.roundsWaited}</small><span class="next-label">Eligible Next</span></div></article>`).join("");
}

function renderQueue() {
  const waiting = getWaitingPlayers();
  const nextIds = new Set(getNextPlayers().map((player) => player.id));
  elements.queueCount.textContent = `${waiting.length} waiting`;
  if (!waiting.length) {
    elements.queueList.innerHTML = `<li>${emptyState("≡", "The queue is clear", state.players.length ? "Everyone active is currently assigned or ready for a new round." : "Add players and generate your first fair matchup.")}</li>`;
    return;
  }
  elements.queueList.innerHTML = waiting.map((player, index) => {
    const isNext = nextIds.has(player.id);
    return `<li class="queue-item${isNext ? " up" : ""}"><span class="queue-position">${String(index + 1).padStart(2,"0")}</span><div class="queue-player"><span class="avatar">${initials(player.name)}</span><div class="queue-player-copy"><strong>${escapeHtml(player.name)}</strong><small>${SKILL_LABELS[player.skill]} · ${player.wins}W ${player.losses}L</small><span class="player-status ${isNext ? "next" : "waiting"}">${isNext ? "Eligible Next" : "Waiting"}</span></div></div><div class="queue-wait"><strong>${player.roundsWaited} round${player.roundsWaited === 1 ? "" : "s"}</strong><small>waited</small></div></li>`;
  }).join("");
}

function playerRowMarkup(player, status) {
  const games = player.wins + player.losses;
  return `<tr><td><div class="table-player"><span class="avatar">${initials(player.name)}</span><div><strong>${escapeHtml(player.name)}</strong><small>Joined this session</small></div></div></td><td><span class="skill-pill">${SKILL_LABELS[player.skill]}</span></td><td>${games}</td><td>${player.wins}</td><td>${player.roundsWaited}</td><td><span class="player-status ${status.className}">${status.label}</span></td><td><div class="row-actions"><button class="row-action" data-player-action="toggle" data-player-id="${player.id}" title="${player.active ? "Set inactive" : "Set active"}">${player.active ? "◉" : "○"}</button><button class="row-action" data-player-action="edit" data-player-id="${player.id}" title="Edit player">✎</button><button class="row-action remove" data-player-action="remove" data-player-id="${player.id}" title="Remove player">×</button></div></td></tr>`;
}

function mobilePlayerMarkup(player, status) {
  const games = player.wins + player.losses;
  return `<article class="player-card-mobile"><header><div class="table-player"><span class="avatar">${initials(player.name)}</span><div><strong>${escapeHtml(player.name)}</strong><span class="skill-badge">${SKILL_LABELS[player.skill]}</span></div></div><span class="player-status ${status.className}">${status.label}</span></header><div class="mobile-player-stats"><span><strong>${games}</strong>Played</span><span><strong>${player.wins}</strong>Wins</span><span><strong>${player.roundsWaited}</strong>Wait</span></div><div class="row-actions"><button class="row-action" data-player-action="toggle" data-player-id="${player.id}">${player.active ? "Set inactive" : "Set active"}</button><button class="row-action" data-player-action="edit" data-player-id="${player.id}">Edit</button><button class="row-action remove" data-player-action="remove" data-player-id="${player.id}">Remove</button></div></article>`;
}

function renderPlayers() {
  elements.rosterCount.textContent = `${state.players.length} player${state.players.length === 1 ? "" : "s"}`;
  elements.removeAllPlayers.hidden = state.players.length === 0;
  if (!state.players.length) {
    elements.playersBody.innerHTML = `<tr class="empty-table"><td colspan="7">${emptyState("＋", "No players yet", "Use Quick Roster to add the first player to this session.")}</td></tr>`;
    elements.playersCards.innerHTML = emptyState("＋", "No players yet", "Use Quick Roster to add the first player.");
    return;
  }
  const assigned = getAssignedPlayerIds();
  const next = new Set(getNextPlayers().map((player) => player.id));
  const sorted = [...state.players].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
  elements.playersBody.innerHTML = sorted.map((player) => playerRowMarkup(player, getPlayerStatus(player, assigned, next))).join("");
  elements.playersCards.innerHTML = sorted.map((player) => mobilePlayerMarkup(player, getPlayerStatus(player, assigned, next))).join("");
}

function renderLeaderboard() {
  if (!state.players.length) {
    elements.leaderboardBody.innerHTML = `<tr class="empty-table"><td colspan="7">${emptyState("↗", "No standings yet", "Player results will appear here as matches finish.")}</td></tr>`;
    return;
  }
  const ranked = [...state.players].sort((a, b) => b.wins - a.wins || getWinRate(b) - getWinRate(a) || a.losses - b.losses || a.name.localeCompare(b.name));
  elements.leaderboardBody.innerHTML = ranked.map((player, index) => {
    const games = player.wins + player.losses;
    const streak = player.streak > 0 ? `W${player.streak}` : player.streak < 0 ? `L${Math.abs(player.streak)}` : "—";
    return `<tr><td><span class="rank-medal">${index + 1}</span></td><td><div class="table-player"><span class="avatar">${initials(player.name)}</span><strong>${escapeHtml(player.name)}</strong></div></td><td>${games}</td><td>${player.wins}</td><td>${player.losses}</td><td class="win-rate">${getWinRate(player).toFixed(0)}%</td><td>${streak}</td></tr>`;
  }).join("");
}

function renderMatchHistory() {
  if (!state.matchHistory.length) {
    elements.matchHistoryList.innerHTML = emptyState("✓", "No completed matches", "Finished matches will appear here with the winning team and court.");
    return;
  }
  elements.matchHistoryList.innerHTML = state.matchHistory.map((match) => {
    const teamA = match.sideA.map((player) => escapeHtml(player.name)).join(" & ");
    const teamB = match.sideB.map((player) => escapeHtml(player.name)).join(" & ");
    const duration = match.startedAt ? Math.max(1, Math.round((match.finishedAt - match.startedAt) / 60000)) : null;
    return `<article class="history-item"><div class="history-result"><span class="history-icon" aria-hidden="true">✓</span><div><strong>Round ${match.round} · Court ${match.court}</strong><small>${duration ? `${duration} min` : "Result recorded"}</small></div></div><div class="history-teams"><span class="${match.winnerSide === "A" ? "history-winner" : ""}">${teamA}${match.winnerSide === "A" ? " · Winner" : ""}</span><b>vs</b><span class="${match.winnerSide === "B" ? "history-winner" : ""}">${teamB}${match.winnerSide === "B" ? " · Winner" : ""}</span></div></article>`;
  }).join("");
}

function getWorkflowState() {
  const needed = state.matchType === "singles" ? 2 : 4;
  const activeCount = getActivePlayers().length;
  const skillEligibility = getSkillEligibility(needed);
  const readyMatch = state.activeMatches.find((match) => match.status === "ready");
  const liveMatch = state.activeMatches.find((match) => match.status === "active");
  const allFinished = state.activeMatches.length > 0 && state.activeMatches.every((match) => match.status === "finished");

  if (activeCount < needed) {
    const remaining = needed - activeCount;
    return { step: "Step 1", title: activeCount ? `Add ${remaining} more player${remaining === 1 ? "" : "s"}` : "Add your first player", guidance: `You need ${needed} active players for a ${state.matchType} match.`, action: "add", label: "Add Player" };
  }
  if (state.skillMatching === "same" && !skillEligibility.eligible) {
    const tier = SKILL_LABELS[skillEligibility.strongestGroup.skill];
    return { step: "Step 1", title: "Build a same-skill group", guidance: `Add ${skillEligibility.needed} more ${tier.toLowerCase()} player${skillEligibility.needed === 1 ? "" : "s"}, or choose Mixed Skills in Settings.`, action: "add", label: "Add Player" };
  }
  if (readyMatch) return { step: "Step 3", title: "Match ready for confirmation", guidance: "Players are assigned to a court. Confirm when everyone is ready to begin.", action: "start", label: "Start Match", matchId: readyMatch.id };
  if (liveMatch) return { step: "Step 4", title: "Match in progress", guidance: "Record the winner when play finishes.", action: "winner", label: "Record Winner", matchId: liveMatch.id };
  if (allFinished) return { step: "Next round", title: "Match finished", guidance: "Results are saved. Generate the next fair matchup when ready.", action: "generate", label: "Generate Next Match" };
  return { step: "Step 2", title: "Enough players are eligible", guidance: "Generate a fair matchup using wait time, skill, and teammate history.", action: "generate", label: "Generate Matchup" };
}

function runWorkflowAction() {
  const workflow = getWorkflowState();
  if (workflow.action === "add") {
    document.querySelector("#add-player-title").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => elements.playerName.focus({ preventScroll: true }), 350);
  }
  if (workflow.action === "generate") generateRound();
  if (workflow.action === "start") startMatch(workflow.matchId);
  if (workflow.action === "winner") {
    const matchButton = document.querySelector(`[data-match-id="${workflow.matchId}"][data-win]`);
    matchButton?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => matchButton?.focus({ preventScroll: true }), 350);
  }
}

function renderWorkflow() {
  const workflow = getWorkflowState();
  elements.workflowStep.textContent = workflow.step;
  elements.workflowTitle.textContent = workflow.title;
  elements.workflowGuidance.textContent = workflow.guidance;
  elements.workflowAction.textContent = workflow.label;
  elements.mobileContextAction.textContent = workflow.label;
  elements.workflowAction.dataset.action = workflow.action;
  elements.mobileContextAction.dataset.action = workflow.action;
  const isEmpty = getActivePlayers().length === 0;
  document.body.classList.toggle("session-empty", isEmpty);
  elements.emptySessionGuide.hidden = !isEmpty;
}

function updateGenerateButton() {
  const needed = state.matchType === "singles" ? 2 : 4;
  const count = getActivePlayers().length;
  const skillEligibility = getSkillEligibility(needed);
  const unfinished = state.activeMatches.some((match) => match.status !== "finished");
  elements.generateRound.disabled = !skillEligibility.eligible;
  elements.generateRound.querySelector("span").textContent = state.activeMatches.length && !unfinished ? "Generate Next Match" : "Generate Matchup";
  elements.generateHelp.textContent = state.skillMatching === "same" && !skillEligibility.eligible
    ? `Same Skill Only: add ${skillEligibility.needed} more ${SKILL_LABELS[skillEligibility.strongestGroup.skill].toLowerCase()} player${skillEligibility.needed === 1 ? "" : "s"} to fill one court.`
    : count < needed
    ? `Add ${needed - count} more active player${needed - count === 1 ? "" : "s"} to generate a ${state.matchType} match.`
    : unfinished
      ? "Finish or clear current court assignments before creating the next round."
      : state.skillMatching === "same"
        ? "A same-skill group is eligible. Queue priority applies within that skill tier."
        : `${count} active players are eligible. KirQ will prioritize wait time and balanced skill.`;
}

function renderAll() {
  renderSummary(); renderCourts(); renderUpNext(); renderQueue(); renderPlayers(); renderLeaderboard(); renderMatchHistory(); updateGenerateButton(); renderWorkflow();
}

function updateMatchTimers() {
  document.querySelectorAll(".match-timer").forEach((timer) => {
    if (!timer.dataset.startedAt) return;
    const start = Number(timer.dataset.startedAt);
    const end = Number(timer.dataset.finishedAt) || Date.now();
    const seconds = Math.max(0, Math.floor((end - start) / 1000));
    const minutes = Math.floor(seconds / 60);
    timer.textContent = `${String(minutes).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")} on court`;
  });
}

function openSettings() {
  settingsScrollY = window.scrollY;
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
  elements.sessionName.value = state.sessionName;
  elements.courtCount.value = state.courtCount;
  elements.teammateLimit.value = String(state.teammateLimit);
  document.querySelector(`input[name="match-type"][value="${state.matchType}"]`).checked = true;
  document.querySelector(`input[name="skill-matching"][value="${state.skillMatching}"]`).checked = true;
  elements.teammateLimit.disabled = state.matchType === "singles";
  elements.settingsOverlay.hidden = false;

  const drawer = elements.settingsOverlay.querySelector(".settings-drawer");
  const focusInputWithoutMovingPage = () => {
    elements.sessionName.focus({ preventScroll: true });
    window.scrollTo({ left: 0, top: settingsScrollY, behavior: "auto" });
  };

  drawer.addEventListener("animationend", focusInputWithoutMovingPage, { once: true });
}

function closeSettings() {
  if (elements.settingsOverlay.hidden) return;
  if (elements.settingsOverlay.contains(document.activeElement)) document.activeElement.blur();
  elements.settingsOverlay.hidden = true;
  window.scrollTo({ left: 0, top: settingsScrollY, behavior: "auto" });
}

function saveSettings() {
  state.sessionName = elements.sessionName.value.trim() || "Open Play Session";
  state.courtCount = Math.max(1, Math.min(20, Number(elements.courtCount.value) || 1));
  state.teammateLimit = elements.teammateLimit.value;
  state.matchType = document.querySelector('input[name="match-type"]:checked').value;
  state.skillMatching = document.querySelector('input[name="skill-matching"]:checked').value;
  if (state.activeMatches.length > state.courtCount) state.activeMatches = state.activeMatches.slice(0, state.courtCount);
  saveState(); renderAll(); closeSettings(); showToast("Session settings saved.");
}

function resetSession() {
  showConfirmation({
    title: "Reset this session?", copy: "All players, matches, queue history, and standings will be cleared.", actionLabel: "Reset everything",
    onConfirm: () => {
      state.players = []; state.currentRound = 0; state.activeMatches = []; state.matchHistory = []; state.teammateHistory = new Map();
      localStorage.removeItem(STORAGE_KEY); closeConfirmation(); closeSettings(); renderAll(); showToast("Session reset. Fresh court, fresh start.");
    }
  });
}

function removeAllPlayers() {
  if (!state.players.length) return;
  showConfirmation({
    title: "Remove all players?",
    copy: "This will clear every player, court assignment, queue position, result, and match history. Session settings will stay unchanged.",
    actionLabel: "Remove all players",
    onConfirm: () => {
      state.players = [];
      state.currentRound = 0;
      state.activeMatches = [];
      state.matchHistory = [];
      state.teammateHistory = new Map();
      saveState();
      closeConfirmation();
      activateTab("players");
      renderAll();
      showToast("All players and session results were removed.");
    }
  });
}

function loadDemo() {
  if (state.players.length) {
    return showConfirmation({
      title: "Load demo session?", copy: "This will replace the current roster and match state with a complete sample session.", actionLabel: "Load demo",
      onConfirm: () => { closeConfirmation(); seedDemo(); }
    });
  }
  seedDemo();
}

function seedDemo() {
  const demo = [
    ["Mika Reyes", "advanced", 3, 0, 2], ["Paolo Cruz", "intermediate", 2, 1, 1],
    ["Bea Santos", "intermediate", 2, 0, 2], ["Nico Ramos", "advanced", 1, 1, 0],
    ["Sam Lee", "beginner", 1, 1, 3], ["Jules Tan", "intermediate", 1, 2, 2],
    ["Rafa Lim", "advanced", 3, 1, 1], ["Anne Co", "beginner", 0, 2, 3],
    ["Gio Uy", "intermediate", 2, 1, 4], ["Lexi Go", "advanced", 2, 2, 2],
    ["Marco Dee", "beginner", 0, 1, 1], ["Iya Torres", "intermediate", 1, 0, 4]
  ];
  state.players = demo.map(([name, skill, wins, losses, roundsWaited]) => ({
    id: createId("player"), name, skill, wins, losses, roundsWaited, streak: wins > losses ? 1 : losses ? -1 : 0, active: true, lastPlayedRound: null
  }));
  state.currentRound = 2;
  state.activeMatches = [];
  state.matchHistory = [];
  state.teammateHistory = new Map();
  createAndApplyRound(2, 4);
  showToast("Demo session loaded. Every control is live.");
}

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const skill = document.querySelector('input[name="player-skill"]:checked').value;
  const result = addPlayer(elements.playerName.value, skill);
  elements.playerFormError.textContent = result.ok ? "" : result.message;
  if (!result.ok) return;
  elements.playerName.value = ""; elements.avatarPreview.textContent = "?"; elements.playerName.focus();
  renderAll(); showToast(result.message);
});

elements.playerName.addEventListener("input", () => { elements.avatarPreview.textContent = initials(elements.playerName.value); elements.playerFormError.textContent = ""; });
elements.generateRound.addEventListener("click", generateRound);
elements.workflowAction.addEventListener("click", runWorkflowAction);
elements.mobileContextAction.addEventListener("click", runWorkflowAction);
elements.emptyAddPlayer.addEventListener("click", runWorkflowAction);
elements.loadDemo.addEventListener("click", loadDemo);
elements.openSettings.addEventListener("click", openSettings);
elements.editSettings.addEventListener("click", openSettings);
elements.closeSettings.addEventListener("click", closeSettings);
elements.saveSettings.addEventListener("click", saveSettings);
elements.resetSession.addEventListener("click", resetSession);
elements.removeAllPlayers.addEventListener("click", removeAllPlayers);
elements.confirmCancel.addEventListener("click", closeConfirmation);
elements.confirmAction.addEventListener("click", () => pendingConfirmation?.());

elements.settingsOverlay.addEventListener("click", (event) => { if (event.target === elements.settingsOverlay) closeSettings(); });
elements.confirmOverlay.addEventListener("click", (event) => { if (event.target === elements.confirmOverlay) closeConfirmation(); });

elements.courtsGrid.addEventListener("click", (event) => {
  const win = event.target.closest("[data-win]");
  const start = event.target.closest("[data-start-match]");
  const end = event.target.closest("[data-end-match]");
  if (win) declareWinner(win.dataset.matchId, win.dataset.win);
  if (start) startMatch(start.dataset.startMatch);
  if (end) endMatch(end.dataset.endMatch);
});

function handlePlayerAction(event) {
  const button = event.target.closest("[data-player-action]");
  if (!button) return;
  const { playerAction, playerId } = button.dataset;
  if (playerAction === "toggle") togglePlayer(playerId);
  if (playerAction === "edit") editPlayer(playerId);
  if (playerAction === "remove") removePlayer(playerId);
}
elements.playersBody.addEventListener("click", handlePlayerAction);
elements.playersCards.addEventListener("click", handlePlayerAction);

document.querySelectorAll('input[name="match-type"]').forEach((radio) => radio.addEventListener("change", () => {
  elements.teammateLimit.disabled = radio.value === "singles" && radio.checked;
}));

function activateTab(tabName, moveFocus = false) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    if (active && moveFocus) button.focus();
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    const active = panel.dataset.panel === tabName;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

const tabButtons = [...document.querySelectorAll("[data-tab]")];
tabButtons.forEach((button, index) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabButtons.length - 1 : index + (event.key === "ArrowRight" ? 1 : -1);
    nextIndex = (nextIndex + tabButtons.length) % tabButtons.length;
    activateTab(tabButtons[nextIndex].dataset.tab, true);
  });
});

document.querySelectorAll(".mobile-nav a").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".mobile-nav a").forEach((item) => item.classList.remove("active"));
  link.classList.add("active");
  if (link.dataset.openTab) activateTab(link.dataset.openTab);
}));

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.confirmOverlay.hidden) closeConfirmation();
  else if (!elements.settingsOverlay.hidden) closeSettings();
});

loadState();
if (new URLSearchParams(window.location.search).get("demo") === "1" && !state.players.length) {
  seedDemo();
} else {
  renderAll();
}
setInterval(updateMatchTimers, 1000);
