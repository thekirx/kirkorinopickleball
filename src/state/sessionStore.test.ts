import { it, expect, beforeEach } from 'vitest';
import { createSessionStore, getDefaultStore } from './sessionStore';
beforeEach(() => localStorage.clear());
it('starts with a warning when accessing the localStorage property itself is blocked', () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')!;
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('Blocked', 'SecurityError');
    },
  });
  try {
    const store = getDefaultStore();
    expect(store.getState().persistenceWarning).toMatch(/storage/i);
    store.getState().act((engine) => engine.addPlayer('Alice', 'intermediate'));
    expect(store.getState().session.players).toHaveLength(1);
  } finally {
    Object.defineProperty(window, 'localStorage', descriptor);
  }
});
it('adopts legacy storage, persists v2, and isolates sessions and credentials', () => {
  localStorage.setItem(
    'kirkorino-pickleball-session-v1',
    JSON.stringify({ players: [{ id: 'a', name: 'Alice' }] }),
  );
  localStorage.setItem('kirq-share-v1', JSON.stringify({ code: 'public', editToken: 'secret' }));
  const store = createSessionStore(localStorage);
  const id = store.getState().sessionId;
  expect(store.getState().session.players[0].name).toBe('Alice');
  expect(store.getState().share?.code).toBe('public');
  store.getState().act((e) => e.addPlayer('Bea', 'pro'));
  expect(JSON.parse(localStorage.getItem(`kirq-session-${id}`)!).schemaVersion).toBe(2);
  store.getState().createSession('Second');
  expect(store.getState().session.players).toHaveLength(0);
  expect(store.getState().share).toBe(null);
  store.getState().switchSession(id);
  expect(store.getState().session.players).toHaveLength(2);
  expect(store.getState().share?.editToken).toBe('secret');
  const restored = createSessionStore(localStorage);
  expect(restored.getState().session.players).toHaveLength(2);
  expect(restored.getState().deleteSession(id)).toBe(true);
  expect(restored.getState().deleteSession(restored.getState().sessionId)).toBe(false);
});
it('retains usable in-memory state and sessions when browser storage throws', () => {
  const bad = {
    getItem() {
      throw Error('blocked');
    },
    setItem() {
      throw Error('quota');
    },
    removeItem() {
      throw Error('blocked');
    },
  };
  const store = createSessionStore(bad);
  const first = store.getState().sessionId;
  store.getState().act((e) => e.addPlayer('Alice', 'intermediate'));
  expect(store.getState().session.players).toHaveLength(1);
  expect(store.getState().persistenceWarning).toMatch(/storage/i);
  store.getState().createSession('Second');
  store.getState().switchSession(first);
  expect(store.getState().session.players[0].name).toBe('Alice');
});
it('does not destroy unsupported future sessions on startup', () => {
  localStorage.setItem(
    'kirq-index-v1',
    JSON.stringify({
      activeId: 'future',
      sessions: [{ id: 'future', name: 'Future', createdAt: 1, updatedAt: 1 }],
    }),
  );
  localStorage.setItem('kirq-session-future', JSON.stringify({ schemaVersion: 99, players: [] }));
  const store = createSessionStore(localStorage);
  expect(store.getState().loadError).toMatch(/version/i);
  expect(JSON.parse(localStorage.getItem('kirq-session-future')!).schemaVersion).toBe(99);
});
it('saves delayed publish credentials against the originating session after a switch', () => {
  const store = createSessionStore(localStorage),
    original = store.getState().sessionId;
  store.getState().createSession('Second');
  store.getState().setShare({ code: 'original-code', editToken: 'original-secret' }, original);
  expect(store.getState().share).toBe(null);
  store.getState().switchSession(original);
  expect(store.getState().share).toEqual({ code: 'original-code', editToken: 'original-secret' });
});
