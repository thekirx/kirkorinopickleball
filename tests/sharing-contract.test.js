const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
function load(fetch) {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const script = html
    .match(/<script>([\s\S]*?)<\/script>/)[1]
    .split(
      "/* =========================================================\n       EVENT LISTENERS",
    )[0];
  const storage = new Map();
  const el = {
    textContent: "",
    dataset: {},
    classList: { add() {}, remove() {} },
    value: "",
  };
  const timers = [];
  const ctx = {
    console,
    Date,
    Math,
    Map,
    Set,
    URL,
    URLSearchParams,
    TextEncoder,
    Uint8Array,
    fetch,
    document: { querySelector: () => ({ ...el }), querySelectorAll: () => [] },
    window: {
      location: { origin: "http://localhost", pathname: "/" },
      localStorage: {
        getItem: (k) => storage.get(k) || null,
        setItem: (k, v) => storage.set(k, v),
        removeItem: (k) => storage.delete(k),
      },
      setTimeout: (fn) => {
        timers.push(fn);
        return timers.length;
      },
      clearTimeout() {},
    },
  };
  vm.createContext(ctx);
  vm.runInContext(
    script +
      "\nglobalThis.api={state,serializeState,publishSession,pushSession,schedulePush,saveState,applySnapshot};",
    ctx,
  );
  return { ...ctx.api, storage, timers };
}
const response = (data) => ({ ok: true, json: async () => data });
test("share payload and backup exclude private edit token", () => {
  const a = load();
  a.state.share = { code: "TEST01", editToken: "private-fixture" };
  assert.ok(!JSON.stringify(a.serializeState()).includes("private-fixture"));
});
test("create/read/update RPC names, keys and token handling are preserved", async () => {
  const calls = [];
  const a = load(async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return response([{ code: "TEST01", edit_token: "private-fixture" }]);
  });
  a.state.sessionId = "one";
  await a.publishSession();
  assert.match(calls[0].url, /rpc\/kirq_create_session$/);
  assert.deepEqual(Object.keys(calls[0].body), ["p_payload"]);
  assert.equal(a.state.share.editToken, "private-fixture");
  await a.pushSession();
  assert.match(calls[1].url, /rpc\/kirq_update_session$/);
  assert.equal(calls[1].body.p_edit_token, "private-fixture");
  assert.ok(
    !JSON.stringify(calls[1].body.p_payload).includes("private-fixture"),
  );
});
test("publish completing after session switch retains token with original session", async () => {
  let finish;
  const a = load(() => new Promise((resolve) => (finish = resolve)));
  a.state.sessionId = "one";
  const pending = a.publishSession();
  a.state.sessionId = "two";
  a.state.share = null;
  finish(response([{ code: "TEST01", edit_token: "private-fixture" }]));
  await pending;
  assert.equal(a.state.share, null);
  assert.equal(
    JSON.parse(a.storage.get("kirq-session-one")).share.editToken,
    "private-fixture",
  );
});
test("queued push carries original session payload across a switch", async () => {
  const calls = [];
  const a = load(async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    return response(null);
  });
  a.state.sessionId = "one";
  a.state.sessionName = "First";
  a.state.share = { code: "FIRST1", editToken: "first-fixture" };
  a.schedulePush();
  a.state.sessionId = "two";
  a.state.sessionName = "Second";
  a.state.share = { code: "SECOND", editToken: "second-fixture" };
  await a.timers[0]();
  assert.equal(calls[0].p_code, "FIRST1");
  assert.equal(calls[0].p_edit_token, "first-fixture");
});
test("viewer never writes local storage or calls update/create RPC", async () => {
  let calls = 0;
  const a = load(async () => {
    calls++;
    return response(null);
  });
  a.state.viewerMode = true;
  a.state.sessionId = "viewer";
  a.state.share = { code: "TEST01", editToken: "private-fixture" };
  a.saveState();
  await a.pushSession();
  assert.equal(calls, 0);
  assert.equal(a.storage.size, 0);
});
