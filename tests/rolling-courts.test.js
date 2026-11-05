const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
function app() {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const script = html
    .match(/<script>([\s\S]*?)<\/script>/)[1]
    .split(
      "/* =========================================================\n       EVENT LISTENERS",
    )[0];
  const el = { value: "", dataset: {}, classList: { add() {}, remove() {} } };
  const memory = new Map();
  const ctx = {
    console,
    Date,
    Map,
    Set,
    Math,
    URL,
    URLSearchParams,
    Uint8Array,
    TextEncoder,
    document: {
      querySelector: () => el,
      querySelectorAll: () => [],
      createElement: () => ({ ...el }),
      createElementNS: () => ({ ...el }),
    },
    window: {
      location: {
        origin: "http://localhost",
        pathname: "/",
        href: "http://localhost/",
      },
      localStorage: { getItem: key => memory.get(key) || null, setItem: (key,value) => memory.set(key,value), removeItem: key => memory.delete(key) },
      setTimeout,
      clearTimeout,
    },
  };
  vm.createContext(ctx);
  vm.runInContext(
    script +
      "\nglobalThis.app={state, compareQueue, getWaitingPlayers, setMode, addPlayer, fillIdleCourts, recordCourtResult, captureUndo, undoLastAction, serializeState, applySnapshot, setPlayerActive, replaceMatchPlayer, substituteInjuredPlayer, updateSettings, removePlayer, updatePlayerRecord, writeJson, readJson, restoreState, moveQueuedPlayer, swapQueuedPlayers, setPartners, clearPartner, swapCourtPlayers};",
    ctx,
  );
  return ctx.app;
}
const p = (id, games = 0, since = 0, skill = "intermediate") => ({
  id,
  name: id,
  skill,
  wins: games,
  losses: 0,
  games,
  since,
  roundsWaited: 0,
  active: true,
});
function setup(n = 10, mode = "open", courts = 2) {
  const a = app();
  a.state.mode = mode;
  a.state.settings = {
    matchType: "doubles",
    courtCount: courts,
    teammateLimit: "unlimited",
  };
  a.state.players = Array.from({ length: n }, (_, i) => p(String(i), 0, i));
  a.state.started = true;
  a.fillIdleCourts(10000);
  return a;
}
const ids = (a) => Array.from(a.getWaitingPlayers(), (p) => p.id);
const stable = (a) => JSON.stringify({ ...a.serializeState(), savedAt: null });
test("open queue uses joining time only and late arrivals join at back", () => {
  const a = app();
  a.state.players = [p("old", 6, 10), p("new", 0, 20), p("middle", 2, 15)];
  assert.deepEqual(ids(a), ["old", "middle", "new"]);
  a.addPlayer("Late", "pro", 30);
  assert.equal(a.getWaitingPlayers().at(-1).name, "Late");
  assert.equal(a.state.players.at(-1).games, 0);
});
test("family queue gives real-zero-game late arrivals priority, then longest wait", () => {
  const a = app();
  a.state.mode = "family";
  a.state.players = [p("two", 2, 1), p("one-new", 1, 3), p("one-old", 1, 2)];
  a.addPlayer("Late", "pro", 4);
  assert.deepEqual(
    Array.from(a.getWaitingPlayers(), (p) => p.name),
    ["Late", "one-old", "one-new", "two"],
  );
  assert.equal(a.state.players.at(-1).wins, 0);
});
test("mode change re-sorts queue without changing a live court", () => {
  const a = setup();
  const before = JSON.stringify(a.state.activeMatches);
  a.state.players[8].wins = 4;
  a.state.players[8].games = 4;
  assert.deepEqual(ids(a), ["8", "9"]);
  assert.equal(a.setMode("family").ok, true);
  assert.deepEqual(ids(a), ["9", "8"]);
  assert.equal(JSON.stringify(a.state.activeMatches), before);
  assert.equal(a.setMode("competition").ok, false);
});
test("result refills only its own court and preserves unrelated game timestamp and identity", () => {
  const a = setup(12);
  const other = a.state.activeMatches[1];
  const snapshot = JSON.stringify(other);
  const m = a.state.activeMatches[0];
  const result = a.recordCourtResult(m.id, "A", 20000);
  assert.equal(result.ok, true);
  assert.equal(a.state.activeMatches.length, 2);
  assert.equal(
    a.state.activeMatches.find((x) => x.court === 2),
    other,
  );
  assert.equal(JSON.stringify(other), snapshot);
  assert.notEqual(a.state.activeMatches.find((x) => x.court === 1).id, m.id);
  assert.equal(a.state.matchLog.length, 1);
  for (const x of [...m.sideA, ...m.sideB]) {
    assert.equal(x.games, x.wins + x.losses);
    assert.equal(x.since, 20000);
  }
});
test("undo restores serialized state, all references, log and teammate history exactly", () => {
  const a = setup(12);
  const before = stable(a);
  a.captureUndo(20000);
  a.recordCourtResult(a.state.activeMatches[0].id, "B", 20000);
  assert.equal(a.undoLastAction(25999).ok, true);
  assert.equal(stable(a), before);
  const match = a.state.activeMatches[0];
  assert.equal(
    match.sideA[0],
    a.state.players.find((p) => p.id === match.sideA[0].id),
  );
});
test("undo expires after six seconds", () => {
  const a = setup();
  a.captureUndo(100);
  assert.equal(a.undoLastAction(6100).ok, false);
});
test("teammate limit tries a later fourth player and never violates limit", () => {
  const a = app();
  a.state.settings = {
    matchType: "doubles",
    courtCount: 1,
    teammateLimit: "1",
  };
  a.state.players = Array.from({ length: 5 }, (_, i) => p(String(i), 0, i));
  for (const pair of ["0|1", "0|2", "0|3", "1|3", "2|3"])
    a.state.teammateHistory.set(pair, 1);
  a.state.started = true;
  a.fillIdleCourts(100);
  assert.equal(a.state.activeMatches.length, 1);
  assert.ok(
    [...a.state.activeMatches[0].sideA, ...a.state.activeMatches[0].sideB].some(
      (p) => p.id === "4",
    ),
  );
  for (const count of a.state.teammateHistory.values()) assert.equal(count, 1);
});
test("impossible teammate layout leaves court idle with explanation", () => {
  const a = app();
  a.state.settings = {
    matchType: "doubles",
    courtCount: 1,
    teammateLimit: "1",
  };
  a.state.players = Array.from({ length: 4 }, (_, i) => p(String(i)));
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) a.state.teammateHistory.set(`${i}|${j}`, 1);
  a.state.started = true;
  a.fillIdleCourts();
  assert.equal(a.state.activeMatches.length, 0);
  assert.match(
    a.state.courtMessages[1],
    /can't be filled without repeating teammates/,
  );
});
test("singles fills two players per court and respects queue", () => {
  const a = app();
  a.state.settings = {
    matchType: "singles",
    courtCount: 2,
    teammateLimit: "1",
  };
  a.state.players = Array.from({ length: 5 }, (_, i) => p(String(i), 0, i));
  a.state.started = true;
  a.fillIdleCourts(20);
  assert.equal(a.state.activeMatches.length, 2);
  assert.deepEqual(ids(a), ["4"]);
  assert.equal(a.state.teammateHistory.size, 0);
});
test("rolling game change window locks exactly at 2:00 and swaps queue timestamp", () => {
  const a = setup(5, "open", 1);
  const m = a.state.activeMatches[0];
  const out = m.sideA[0];
  assert.equal(a.replaceMatchPlayer(m.id, out.id, "4", 129999).ok, true);
  assert.equal(out.since, 4);
  assert.equal(
    a.replaceMatchPlayer(m.id, "4", out.id, 130000).reason,
    "change-window-expired",
  );
});
test("injury closest-skill tie follows selected queue mode and undo restores timeout", () => {
  const a = setup(7, "family", 1);
  const m = a.state.activeMatches[0];
  const out = m.sideA[0];
  a.state.players[4].wins = 2;
  a.state.players[4].games = 2;
  const before = stable(a);
  a.captureUndo(200000);
  const r = a.substituteInjuredPlayer(m.id, out.id, 200000);
  assert.equal(r.replacement.id, "5");
  assert.equal(out.active, false);
  a.undoLastAction(200001);
  assert.equal(stable(a), before);
});
test("old saved session migrates to open with real games, order, stable courts and generatedAt", () => {
  const a = app();
  const saved = {
    players: [
      { ...p("a", 2), since: undefined, games: 99, roundsWaited: 4 },
      { ...p("b", 1), since: undefined, roundsWaited: 1 },
    ],
    activeMatches: [],
    teammateHistory: [["a|b", 2]],
    currentRound: 3,
  };
  assert.equal(a.applySnapshot(saved, 5000000), true);
  assert.equal(a.state.mode, "open");
  assert.equal(a.state.players[0].games, 2);
  assert.equal(a.state.players[0].since, 5000000 - 4 * 720000);
  assert.deepEqual(ids(a), ["a", "b"]);
});
test("saved mode/settings and retired courts roundtrip; finished legacy courts release players", () => {
  const a = setup(8, "family");
  const payload = a.serializeState();
  payload.activeMatches[0].status = "finished";
  const b = app();
  b.applySnapshot(payload);
  assert.equal(b.state.mode, "family");
  assert.equal(b.state.settings.courtCount, 2);
  assert.equal(b.state.activeMatches.length, 1);
  assert.equal(b.getWaitingPlayers().length, 4);
});
test("courts retire after their games; adding a court fills immediately", () => {
  const a = setup(16);
  a.updateSettings({ courtCount: 1 }, 11000);
  assert.equal(a.state.activeMatches.length, 2);
  a.recordCourtResult(
    a.state.activeMatches.find((m) => m.court === 2).id,
    "A",
    12000,
  );
  assert.equal(a.state.activeMatches.length, 1);
  a.updateSettings({ courtCount: 2 }, 13000);
  assert.equal(a.state.activeMatches.length, 2);
});
test("return from timeout joins at back and can fill an idle court", () => {
  const a = setup(4, "open", 1);
  const m = a.state.activeMatches[0];
  a.state.activeMatches = [];
  a.state.players[0].active = false;
  a.setPlayerActive("0", true, 20000);
  assert.equal(a.state.players[0].since, 20000);
  assert.equal(a.state.activeMatches.length, 1);
});
test("record edit keeps real games invariant; removing on-court player cancels without a result", () => {
  const a = setup(6, "open", 1);
  a.updatePlayerRecord("0", "losses", 2);
  assert.equal(a.state.players[0].games, 2);
  const id = a.state.activeMatches[0].sideA[0].id;
  a.removePlayer(id, 20000);
  assert.equal(a.state.matchLog.length, 0);
  assert.equal(a.state.activeMatches.length, 1);
  assert.ok(
    !a.state.activeMatches
      .flatMap((m) => [...m.sideA, ...m.sideB])
      .some((p) => p.id === id),
  );
});

test("organizer restore resumes finished legacy courts without adding duplicate results", () => {
  const a = setup(8); const saved = a.serializeState();
  saved.activeMatches.forEach(m => m.status = "finished");
  delete saved.started; delete saved.settings; delete saved.mode;
  a.writeJson("kirq-index-v1", { activeId: "old", sessions: [{ id: "old", name: "Old day" }] });
  a.writeJson("kirq-session-old", saved);
  const b = a.state.matchLog.length;
  a.restoreState();
  assert.equal(a.state.mode, "open");
  assert.equal(a.state.activeMatches.length, 2);
  assert.equal(a.state.matchLog.length, b);
  const ids = a.state.activeMatches.flatMap(m => [...m.sideA,...m.sideB].map(p => p.id));
  assert.equal(new Set(ids).size, 8);

  // The refill is saved, so a second reload resumes the same courts instead of re-drawing.
  const stored = a.readJson("kirq-session-old");
  assert.deepEqual(stored.activeMatches.map(m => m.id), a.state.activeMatches.map(m => m.id));
  const firstDraw = a.state.activeMatches.map(m => [m.id, m.startedAt]);
  a.restoreState();
  assert.deepEqual(a.state.activeMatches.map(m => [m.id, m.startedAt]), firstDraw);
});

test("moving a player pins their spot; others keep the mode order", () => {
  const a = app();
  a.state.players = Array.from({ length: 6 }, (_, i) => p(String(i), 0, i));
  assert.equal(a.moveQueuedPlayer("5", 1, 100).ok, true);
  assert.deepEqual(ids(a), ["0", "5", "1", "2", "3", "4"]);
  a.addPlayer("Late", "pro", 50);
  assert.equal(ids(a)[1], "5");
  assert.equal(a.moveQueuedPlayer("4", 0, 200).ok, true);
  assert.deepEqual(ids(a).slice(0, 3), ["4", "0", "5"]);
});

test("a pinned player moves up as people ahead play and is not pushed back when they return", () => {
  const a = setup(4, "open", 1);
  a.state.activeMatches = [];
  a.state.players.push(...["4", "5", "6", "7", "8"].map((id, i) => p(id, 0, 10 + i)));
  assert.equal(a.moveQueuedPlayer("8", 4, 100).ok, true);
  assert.equal(ids(a)[4], "8");
  a.fillIdleCourts(200);
  assert.equal(ids(a)[0], "8");
  a.recordCourtResult(a.state.activeMatches[0].id, "A", 300);
  // 8 played next, so its pin is gone and the four who just played are behind.
  assert.ok(!a.state.players.find((x) => x.id === "8").pin);
});

test("swapping two queued players exchanges their spots and undo restores them", () => {
  const a = app();
  a.state.players = Array.from({ length: 6 }, (_, i) => p(String(i), 0, i));
  a.captureUndo(1);
  assert.equal(a.swapQueuedPlayers("1", "5", 2).ok, true);
  assert.deepEqual(ids(a), ["0", "5", "2", "3", "4", "1"]);
  assert.equal(a.undoLastAction(3).ok, true);
  assert.deepEqual(ids(a), ["0", "1", "2", "3", "4", "5"]);
});

test("locked partners wait together and play on the same team, past the teammate limit", () => {
  const a = app();
  a.state.settings = { matchType: "doubles", courtCount: 1, teammateLimit: "1" };
  a.state.players = Array.from({ length: 8 }, (_, i) => p(String(i), 0, i, i % 2 ? "pro" : "beginner"));
  a.setPartners("0", "6");
  a.state.teammateHistory.set("0|6", 1);
  assert.deepEqual(ids(a).slice(0, 4), ["0", "6", "1", "2"]);
  a.state.started = true;
  a.fillIdleCourts(100);
  const m = a.state.activeMatches[0];
  const team = [m.sideA, m.sideB].find((t) => t.some((x) => x.id === "0"));
  assert.deepEqual(Array.from(team, (x) => x.id).sort(), ["0", "6"]);
});

test("a pair never straddles the last spot; the player ahead waits instead", () => {
  const a = app();
  a.state.players = Array.from({ length: 6 }, (_, i) => p(String(i), 0, i));
  a.setPartners("3", "4");
  assert.deepEqual(ids(a).slice(0, 4), ["0", "1", "3", "4"]);
  assert.equal(ids(a)[4], "2");
  assert.equal(a.clearPartner("4").ok, true);
  assert.deepEqual(ids(a), ["0", "1", "2", "3", "4", "5"]);
});

test("pins and partners survive save and reload", () => {
  const a = app();
  a.state.players = Array.from({ length: 6 }, (_, i) => p(String(i), 0, i));
  a.moveQueuedPlayer("5", 0, 10);
  a.setPartners("1", "2");
  const b = app();
  b.applySnapshot(JSON.parse(JSON.stringify(a.serializeState())));
  assert.deepEqual(ids(b), ids(a));
  assert.equal(b.state.players.find((x) => x.id === "1").partner, "2");
});

test("swapping players across teams on court updates teams and teammate history", () => {
  const a = setup(4, "open", 1);
  const m = a.state.activeMatches[0];
  const [x] = m.sideA, [y] = m.sideB;
  const keepA = m.sideA[1], keepB = m.sideB[1];
  a.captureUndo(1);
  assert.equal(a.swapCourtPlayers(m.id, x.id, y.id).ok, true);
  assert.ok(m.sideA.includes(y) && m.sideB.includes(x));
  const key = (p, q) => [p.id, q.id].sort().join("|");
  assert.equal(a.state.teammateHistory.get(key(y, keepA)), 1);
  assert.ok(!a.state.teammateHistory.get(key(x, keepA)));
  assert.equal(a.swapCourtPlayers(m.id, x.id, keepB.id).ok, false);
  assert.equal(a.undoLastAction(2).ok, true);
  assert.ok(a.state.activeMatches[0].sideA.some((p) => p.id === x.id));
});
