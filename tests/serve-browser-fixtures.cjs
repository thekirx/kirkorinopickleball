// Local-only browser QA server. Every Supabase request is intercepted before the app boots.
// No request made through this server can publish to production.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const now = Date.now();
const names = [
  "Kirk",
  "Bea",
  "Migs",
  "Jo",
  "Paolo",
  "Ana",
  "Ces",
  "Rey",
  "Gab",
  "Lia",
  "Nico",
  "Tin",
  "Carlo",
  "Dani",
  "Ella",
  "Franz",
  "Iya",
  "Joms",
];
const skills = [
  "pro",
  "intermediate",
  "intermediate",
  "pro",
  "intermediate",
  "beginner",
  "intermediate",
  "beginner",
  "beginner",
  "intermediate",
  "intermediate",
  "pro",
  "pro",
  "intermediate",
  "beginner",
  "intermediate",
  "beginner",
  "intermediate",
];
const players = names.map((name, i) => ({
  id: "fixture-" + i,
  name,
  skill: skills[i],
  wins: i === 0 || i === 11 || i === 17 ? 2 : i === 13 || i === 14 ? 0 : 1,
  losses: i === 0 || i === 11 || i === 12 || i === 15 || i === 17 ? 0 : 1,
  roundsWaited: i < 12 ? 0 : i < 14 ? 2 : 1,
  active: true,
  since:
    now -
    (i === 12
      ? 974000
      : i === 13
        ? 964000
        : i === 14
          ? 416000
          : i === 15
            ? 406000
            : i === 16
              ? 216000
              : 206000),
  lastPlayedRound: 1,
}));
players.forEach((p) => (p.games = p.wins + p.losses));
const ids = (idx) => idx.map((i) => "fixture-" + i);
const payload = {
  version: 1,
  sessionName: "Sat open play",
  mode: "family",
  started: true,
  settings: { matchType: "doubles", courtCount: 3, teammateLimit: "2" },
  called: null,
  courtMessages: {},
  players,
  currentRound: 1,
  activeMatches: [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10, 11],
  ].map((group, i) => ({
    id: "fixture-match-" + i,
    court: i + 1,
    sideA: ids(group.slice(0, 2)),
    sideB: ids(group.slice(2)),
    status: "active",
    winnerSide: null,
    generatedAt: now - [553000, 339000, 102000][i],
    startedAt: now - [553000, 339000, 102000][i],
  })),
  matchLog: [
    {
      id: "fixture-log",
      round: 1,
      court: 2,
      matchType: "Doubles",
      winners: ["Kirk", "Bea"],
      losers: ["Migs", "Jo"],
      winnerSide: "A",
      finishedAt: new Date(now - 600000).toISOString(),
    },
  ],
  teammateHistory: [
    ["fixture-0|fixture-1", 1],
    ["fixture-2|fixture-3", 1],
    ["fixture-4|fixture-5", 1],
    ["fixture-6|fixture-7", 1],
    ["fixture-8|fixture-9", 1],
    ["fixture-10|fixture-11", 1],
  ],
};
let shared = structuredClone(payload);
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/__rpc/")) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || "{}");
    const name = url.pathname.split("/").at(-1);
    res.setHeader("content-type", "application/json");
    if (name === "kirq_create_session") {
      shared = body.p_payload;
      res.end(
        JSON.stringify([{ code: "TEST01", edit_token: "fixture-only-token" }]),
      );
    } else if (name === "kirq_update_session") {
      shared = body.p_payload;
      res.end("null");
    } else
      res.end(
        JSON.stringify([
          { payload: shared, updated_at: new Date().toISOString() },
        ]),
      );
    return;
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const fixture = url.searchParams.get("fixture");
    const seed = structuredClone(payload);
    if (fixture === "legacy") {
      delete seed.mode;
      delete seed.settings;
      delete seed.started;
      seed.players.forEach((p) => {
        delete p.games;
        delete p.since;
      });
      seed.activeMatches.forEach((m) => {
        delete m.court;
        delete m.startedAt;
      });
    }
    const injection = `<script>\n(()=>{const realFetch=window.fetch.bind(window);window.fetch=(url,options)=>{const u=new URL(url,location.href);if(u.hostname.endsWith('.supabase.co'))return realFetch('/__rpc/'+u.pathname.split('/').pop(),options);return realFetch(url,options);};${fixture === "legacy" || fixture === "reference" ? `localStorage.setItem('kirq-index-v1',JSON.stringify({activeId:'fixture-session',sessions:[{id:'fixture-session',name:'Sat open play',createdAt:${now},updatedAt:${now}}]}));localStorage.setItem('kirq-session-fixture-session',JSON.stringify(${JSON.stringify(seed)}));` : ""}})();\n</script>`;
    html = html.replace("<script>", injection + "<script>");
    res.setHeader("content-type", "text/html");
    res.end(html);
    return;
  }
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});
server.listen(8081, "127.0.0.1", () =>
  console.log(
    "Local stubbed browser QA: http://127.0.0.1:8081/?fixture=reference",
  ),
);
