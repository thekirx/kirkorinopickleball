import { beforeEach, expect, it } from 'vitest';
import { createSessionStore } from './sessionStore';
import { serializeState } from '../domain/serialize';

beforeEach(() => localStorage.clear());
function seeded() {
  const store = createSessionStore(localStorage);
  store.getState().setGameDaySettings({ autoPrepare: false });
  for (const name of ['Ana', 'Ben', 'Cy', 'Dee', 'Eve', 'Fin'])
    store.getState().act((e) => e.addPlayer(name, 'intermediate'));
  return store;
}
it('saves settings and FIFO selections across reload, independently for each day', () => {
  const store = seeded();
  const first = store.getState().sessionId;
  const [ana, ben] = store.getState().session.players;
  store
    .getState()
    .setGameDaySettings({ courts: 1, type: 'singles', limit: 'unlimited', lateArrivals: 'next' });
  expect(store.getState().queuePlayer(ben.id).ok).toBe(true);
  expect(store.getState().queuePlayer(ana.id).ok).toBe(true);
  store.getState().queuePlayer(ben.id);
  const reloaded = createSessionStore(localStorage);
  expect(reloaded.getState().gameDay).toMatchObject({
    courts: 1,
    type: 'singles',
    limit: 'unlimited',
    lateArrivals: 'next',
    nextPlayerIds: [ben.id, ana.id],
  });
  reloaded.getState().createSession('Other group');
  expect(reloaded.getState().gameDay).toMatchObject({
    courts: 2,
    type: 'doubles',
    limit: '2',
    lateArrivals: 'back',
    nextPlayerIds: [],
  });
  reloaded.getState().switchSession(first);
  expect(reloaded.getState().gameDay.nextPlayerIds).toEqual([ben.id, ana.id]);
  reloaded.getState().cancelQueuedPlayer(ben.id);
  expect(reloaded.getState().gameDay.nextPlayerIds).toEqual([ana.id]);
});
it('clears selections for breaks, removals and players who actually enter a court', () => {
  const store = seeded();
  const [a, b, c, d, e, f] = store.getState().session.players;
  for (const p of [a, b, c, d, e, f]) store.getState().queuePlayer(p.id);
  store.getState().act((engine) => engine.setPlayerActive(b.id, false));
  store.getState().act((engine) => engine.removePlayer(c.id));
  expect(store.getState().queuePlayer(b.id).ok).toBe(false);
  store.getState().act((engine) => {
    const plan = engine.createRoundPlan({
      matchType: 'singles',
      courtCount: 1,
      teammateLimit: Infinity,
      priorityPlayerIds: store.getState().gameDay.nextPlayerIds,
    });
    if (!plan.ok) throw Error(plan.message);
    engine.applyRoundPlan(plan, 'singles');
  });
  expect(store.getState().gameDay.nextPlayerIds).toEqual([e.id, f.id]);
  expect(store.getState().queuePlayer(a.id).ok).toBe(false);
  expect(
    store
      .getState()
      .session.activeMatches[0].sideA.concat(store.getState().session.activeMatches[0].sideB)
      .map((p) => p.id)
      .sort(),
  ).toEqual([a.id, d.id].sort());
});
it('retains pending selections when generation fails and keeps organizer metadata out of public payloads', () => {
  const store = seeded();
  const first = store.getState().sessionId;
  const a = store.getState().session.players[0];
  store.getState().queuePlayer(a.id);
  store.getState().act((e) => {
    for (const p of store.getState().session.players.slice(1)) e.setPlayerActive(p.id, false);
  });
  const result = store.getState().act((e) =>
    e.createRoundPlan({
      matchType: 'doubles',
      courtCount: 1,
      teammateLimit: 2,
      priorityPlayerIds: store.getState().gameDay.nextPlayerIds,
    }),
  );
  expect(result?.ok).toBe(false);
  expect(store.getState().gameDay.nextPlayerIds).toEqual([a.id]);
  expect(serializeState(store.getState().session)).not.toHaveProperty('gameDay');
  expect(serializeState(store.getState().session)).not.toHaveProperty('nextPlayerIds');
  store.getState().createSession('Second');
  store.getState().setShare({ code: 'test', editToken: 'synthetic' }, first);
  store.getState().switchSession(first);
  expect(store.getState().gameDay.nextPlayerIds).toEqual([a.id]);
});
it('recovers from malformed local settings without blocking the saved session', () => {
  const store = seeded(),
    id = store.getState().sessionId;
  const raw = JSON.parse(localStorage.getItem(`kirq-session-${id}`)!);
  localStorage.setItem(
    `kirq-session-${id}`,
    JSON.stringify({
      ...raw,
      gameDay: {
        courts: NaN,
        type: 'bad',
        limit: 'oops',
        lateArrivals: 'bad',
        nextPlayerIds: ['missing', 'missing', 4],
      },
    }),
  );
  const restored = createSessionStore(localStorage);
  expect(restored.getState().gameDay).toMatchObject({
    courts: 2,
    type: 'doubles',
    limit: '2',
    lateArrivals: 'back',
    nextPlayerIds: [],
  });
  expect(restored.getState().session.players).toHaveLength(6);
});

it('consumes a queued finished-player swap-in and preserves the other court across reload', () => {
  const store = seeded();
  for (const name of ['Gil', 'Hal', 'Ida', 'Jo'])
    store.getState().act((e) => e.addPlayer(name, 'intermediate'));
  store.getState().act((e) => {
    const plan = e.createRoundPlan({
      matchType: 'doubles',
      courtCount: 2,
      teammateLimit: Infinity,
    });
    if (!plan.ok) throw Error(plan.message);
    e.applyRoundPlan(plan, 'doubles');
  });
  const [first, other] = store.getState().session.activeMatches;
  store.getState().act((e) => e.declareWinner(first.id, 'A'));
  store.getState().queuePlayer(first.sideA[0].id);
  store.getState().act((e) => e.swapPlayers(first.sideA[0].id, other.sideA[0].id));
  expect(store.getState().gameDay.nextPlayerIds).toEqual([]);
  const restored = createSessionStore(localStorage).getState();
  expect(restored.session.activeMatches).toHaveLength(1);
  expect(restored.session.activeMatches[0].courtId).toBe('court-2');
  expect(restored.session.activeMatches[0].id).toBe(other.id);
  expect(restored.session.matchLog[0].id).toBe(first.id);
});

it('persists drafts and shared waiting order, publishes manual queue edits, and invalidates on breaks', () => {
  const store = seeded();
  for (let i = 0; i < 14; i++)
    store.getState().act((e) => e.addPlayer(`Extra ${i}`, 'intermediate'));
  store.getState().act((e) => {
    const p = e.createRoundPlan({ matchType: 'doubles', courtCount: 2, teammateLimit: Infinity });
    if (!p.ok) throw Error(p.message);
    e.applyRoundPlan(p, 'doubles');
  });
  const chosen = store.getState().session.waitingPlayerIds.at(-1)!;
  const before = store.getState().session;
  store.getState().queuePlayer(chosen);
  expect(store.getState().session).not.toBe(before);
  expect(store.getState().session.waitingPlayerIds[0]).toBe(chosen);
  store.getState().act((e) =>
    e.draftNextGames(2, {
      matchType: 'doubles',
      courtCount: 2,
      teammateLimit: Infinity,
      priorityPlayerIds: store.getState().gameDay.nextPlayerIds,
    }),
  );
  const reloaded = createSessionStore(localStorage);
  expect(reloaded.getState().session.queuedGames).toEqual(store.getState().session.queuedGames);
  expect(reloaded.getState().session.waitingPlayerIds).toEqual(
    store.getState().session.waitingPlayerIds,
  );
  const reserved = reloaded.getState().session.queuedGames[0].sideA[0];
  expect(reloaded.getState().queuePlayer(reserved).ok).toBe(false);
  reloaded.getState().act((e) => e.setPlayerActive(reserved, false));
  expect(reloaded.getState().session.queuedGames).toHaveLength(1);
  expect(reloaded.getState().queueNotice).toMatch(/removed/);
  reloaded.getState().setGameDaySettings({ type: 'singles' });
  expect(reloaded.getState().session.queuedGames).toEqual([]);
  expect(reloaded.getState().queueNotice).toMatch(/settings/);
});

it('automatically prepares and refills fixed upcoming games without starting a court, and persists preferences', () => {
  const store = createSessionStore(localStorage);
  expect(store.getState().gameDay.autoPrepare).toBe(true);
  store.getState().setGameDaySettings({ courts: 1, draftCount: 2, limit: 'unlimited' });
  for (let i = 0; i < 20; i++)
    store.getState().act((e) => e.addPlayer(`Auto ${i}`, 'intermediate'));
  expect(store.getState().session.queuedGames).toHaveLength(0); // no drafting before setup
  store.getState().act((e) => {
    const plan = e.createRoundPlan({
      matchType: 'doubles',
      courtCount: 1,
      teammateLimit: Infinity,
    });
    if (!plan.ok) throw Error(plan.message);
    e.applyRoundPlan(plan, 'doubles');
  });
  const before = structuredClone(store.getState().session.queuedGames);
  expect(before).toHaveLength(2);
  store.getState().act((e) => e.addPlayer('Late', 'beginner'));
  expect(store.getState().session.queuedGames).toEqual(before);
  const match = store.getState().session.activeMatches[0];
  store.getState().act((e) => e.declareWinner(match.id, 'A'));
  expect(store.getState().session.activeMatches[0].status).toBe('finished');
  store
    .getState()
    .act((e) =>
      e.startCourtGame(1, { matchType: 'doubles', courtCount: 1, teammateLimit: Infinity }),
    );
  expect(store.getState().session.activeMatches[0].id).toBe(before[0].id);
  expect(store.getState().session.queuedGames).toHaveLength(2);
  expect(store.getState().session.queuedGames[0]).toEqual(before[1]);
  const reloaded = createSessionStore(localStorage);
  expect(reloaded.getState().gameDay.autoPrepare).toBe(true);
  expect(reloaded.getState().session.queuedGames).toEqual(store.getState().session.queuedGames);
  reloaded.getState().clearUpcomingGames();
  expect(reloaded.getState().gameDay.autoPrepare).toBe(false);
  expect(reloaded.getState().session.queuedGames).toEqual([]);
  reloaded.getState().act((e) => e.addPlayer('Another', 'intermediate'));
  expect(reloaded.getState().session.queuedGames).toEqual([]);
});

it('keeps legacy days manual and reports automatic preparation shortages without changing games', () => {
  const store = seeded();
  const id = store.getState().sessionId;
  const raw = JSON.parse(localStorage.getItem(`kirq-session-${id}`)!);
  delete raw.gameDay.autoPrepare;
  localStorage.setItem(`kirq-session-${id}`, JSON.stringify(raw));
  const legacy = createSessionStore(localStorage);
  expect(legacy.getState().gameDay.autoPrepare).toBe(false);
  legacy.getState().setGameDaySettings({ autoPrepare: true, courts: 1 });
  legacy.getState().act((e) => {
    const p = e.createRoundPlan({ matchType: 'doubles', courtCount: 1, teammateLimit: Infinity });
    if (!p.ok) throw Error(p.message);
    e.applyRoundPlan(p, 'doubles');
  });
  expect(legacy.getState().session.queuedGames).toHaveLength(0);
  expect(legacy.getState().preparationNotice).toMatch(/waiting/);
  legacy.getState().createSession('Fresh auto day');
  expect(legacy.getState().gameDay.autoPrepare).toBe(true);
  legacy.getState().switchSession(id);
  expect(legacy.getState().gameDay.autoPrepare).toBe(true);
});

it('explains partner-limit failures and preserves every announced team during automatic changes', () => {
  const store = seeded();
  for (let i = 0; i < 10; i++)
    store.getState().act((e) => e.addPlayer(`Limited ${i}`, 'intermediate'));
  store.getState().setGameDaySettings({ courts: 1, limit: '1', draftCount: 3 });
  store.getState().act((e) => {
    const plan = e.createRoundPlan({ matchType: 'doubles', courtCount: 1, teammateLimit: 1 });
    if (!plan.ok) throw Error(plan.message);
    e.applyRoundPlan(plan, 'doubles');
    return e.draftNextGames(1, { matchType: 'doubles', courtCount: 1, teammateLimit: 1 });
  });
  const fixed = structuredClone(store.getState().session.queuedGames[0]);
  const snapshot = structuredClone(store.getState().session);
  for (const a of snapshot.players)
    for (const b of snapshot.players) {
      if (a.id !== b.id) snapshot.teammateHistory.set([a.id, b.id].sort().join('|'), 1);
    }
  store.getState().restoreSession(snapshot);
  store.getState().setGameDaySettings({ autoPrepare: true });
  expect(store.getState().session.queuedGames).toEqual([fixed]);
  expect(store.getState().preparationNotice).toMatch(/limit/);
  store.getState().act((e) => e.swapPlayers('missing', 'other'));
  expect(store.getState().session.queuedGames).toEqual([fixed]);
  expect(store.getState().preparationNotice).toMatch(/limit/);
  store.getState().setGameDaySettings({ draftCount: 1 });
  expect(store.getState().session.queuedGames).toEqual([fixed]);
});

it('retains a useful partner-limit explanation after partial automatic preparation and reload', () => {
  const store = seeded();
  for (let i = 0; i < 10; i++)
    store.getState().act((e) => e.addPlayer(`Partial ${i}`, 'intermediate'));
  store.getState().setGameDaySettings({ courts: 1, limit: '1', draftCount: 3 });
  store.getState().act((e) => {
    const plan = e.createRoundPlan({ matchType: 'doubles', courtCount: 1, teammateLimit: 1 });
    if (!plan.ok) throw Error(plan.message);
    e.applyRoundPlan(plan, 'doubles');
  });
  const snapshot = structuredClone(store.getState().session);
  const blocked = snapshot.waitingPlayerIds.slice(4, 8);
  for (const a of blocked)
    for (const b of blocked) if (a !== b) snapshot.teammateHistory.set([a, b].sort().join('|'), 1);
  store.getState().restoreSession(snapshot);
  store.getState().setGameDaySettings({ autoPrepare: true });
  expect(store.getState().session.queuedGames).toHaveLength(1);
  expect(store.getState().preparationNotice).toMatch(/limit/);
  const fixed = structuredClone(store.getState().session.queuedGames);
  const reload = createSessionStore(localStorage);
  expect(reload.getState().preparationNotice).toMatch(/limit/);
  expect(reload.getState().session.queuedGames).toEqual(fixed);
});
