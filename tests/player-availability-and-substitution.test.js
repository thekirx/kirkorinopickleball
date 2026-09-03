const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadAppLogic() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const logicOnly = script.split(
    "/* =========================================================\n       EVENT LISTENERS"
  )[0];
  const fakeElement = { value: "", dataset: {}, classList: { add() {}, remove() {} } };
  const context = {
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
      querySelector: () => fakeElement,
      querySelectorAll: () => [],
      createElement: () => ({ ...fakeElement }),
      createElementNS: () => ({ ...fakeElement })
    },
    window: {
      location: { origin: "http://localhost", pathname: "/", href: "http://localhost/" },
      localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      setTimeout,
      clearTimeout
    }
  };

  vm.createContext(context);
  vm.runInContext(
    `${logicOnly}\n` +
      `globalThis.__logic = {\n` +
      `  state, createRoundPlan, applyRoundPlan, getAssignedPlayerIds,\n` +
      `  setPlayerActive: typeof setPlayerActive === "function" ? setPlayerActive : undefined,\n` +
      `  replaceMatchPlayer: typeof replaceMatchPlayer === "function" ? replaceMatchPlayer : undefined,\n` +
      `  substituteInjuredPlayer: typeof substituteInjuredPlayer === "function" ? substituteInjuredPlayer : undefined\n` +
      `};`,
    context
  );

  return context.__logic;
}

function player(id, skill = "intermediate", roundsWaited = 0, active = true) {
  return {
    id,
    name: id.toUpperCase(),
    skill,
    roundsWaited,
    wins: 0,
    losses: 0,
    lastPlayedRound: null,
    active
  };
}

test("timed-out players are excluded from selection and do not gain waiting rounds", () => {
  const app = loadAppLogic();
  assert.equal(typeof app.setPlayerActive, "function");

  const paused = player("paused", "pro", 7);
  app.state.players = [
    paused,
    player("a", "beginner", 3),
    player("b", "intermediate", 2),
    player("c", "intermediate", 1),
    player("d", "pro", 0)
  ];

  assert.equal(app.setPlayerActive(paused.id, false).ok, true);
  const plan = app.createRoundPlan({ matchType: "doubles", courtCount: 1, teammateLimit: Infinity });
  assert.equal(plan.ok, true);
  assert.deepEqual(
    [...plan.selectedPlayers.map((item) => item.id)].sort(),
    ["a", "b", "c", "d"]
  );

  app.applyRoundPlan(plan, "doubles", 1_000);
  assert.equal(paused.roundsWaited, 7);
  assert.equal(app.setPlayerActive(paused.id, true).ok, true);
  assert.equal(paused.active, true);
});

test("ordinary player changes work before two minutes and lock at the deadline", () => {
  const app = loadAppLogic();
  assert.equal(typeof app.replaceMatchPlayer, "function");

  const players = [player("a"), player("b"), player("c"), player("d"), player("e", "pro", 4)];
  app.state.players = players;
  app.state.activeMatches = [{
    id: "match-1",
    sideA: [players[0], players[1]],
    sideB: [players[2], players[3]],
    status: "active",
    winnerSide: null,
    generatedAt: 10_000
  }];

  const changed = app.replaceMatchPlayer("match-1", "a", "e", 129_999, "standard");
  assert.equal(changed.ok, true);
  assert.deepEqual(app.state.activeMatches[0].sideA.map((item) => item.id), ["e", "b"]);

  const locked = app.replaceMatchPlayer("match-1", "e", "a", 130_000, "standard");
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, "change-window-expired");
});

test("injury substitution after two minutes chooses closest skill then longest wait", () => {
  const app = loadAppLogic();
  assert.equal(typeof app.substituteInjuredPlayer, "function");

  const injured = player("injured", "intermediate");
  const players = [
    injured,
    player("partner", "beginner"),
    player("opponent-1", "pro"),
    player("opponent-2", "pro"),
    player("beginner-waiting", "beginner", 9),
    player("best-short-wait", "intermediate", 2),
    player("best-long-wait", "intermediate", 5)
  ];
  app.state.players = players;
  app.state.activeMatches = [{
    id: "match-1",
    sideA: [players[0], players[1]],
    sideB: [players[2], players[3]],
    status: "active",
    winnerSide: null,
    generatedAt: 10_000
  }];

  const result = app.substituteInjuredPlayer("match-1", injured.id, 500_000);
  assert.equal(result.ok, true);
  assert.equal(result.replacement.id, "best-long-wait");
  assert.equal(injured.active, false);
  assert.equal(result.replacement.roundsWaited, 0);
  assert.equal(app.getAssignedPlayerIds().has(result.replacement.id), true);
});

test("a doubles substitution moves teammate history to the final pairing", () => {
  const app = loadAppLogic();
  const players = [player("a"), player("b"), player("c"), player("d"), player("e")];
  app.state.players = players;
  app.state.activeMatches = [{
    id: "match-1",
    sideA: [players[0], players[1]],
    sideB: [players[2], players[3]],
    status: "active",
    winnerSide: null,
    generatedAt: 10_000
  }];
  app.state.teammateHistory.set("a|b", 1);
  app.state.teammateHistory.set("c|d", 1);

  const result = app.replaceMatchPlayer("match-1", "a", "e", 20_000, "standard");
  assert.equal(result.ok, true);
  assert.equal(app.state.teammateHistory.has("a|b"), false);
  assert.equal(app.state.teammateHistory.get("b|e"), 1);
  assert.equal(app.state.teammateHistory.get("c|d"), 1);
});
