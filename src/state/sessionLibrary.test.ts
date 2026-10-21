import { it, expect, afterEach } from 'vitest';
import { SafeStorage } from './storage';
import { SessionLibrary } from './sessionLibrary';

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

afterEach(() => {
  // Remove the own-property shadow so the real prototype method is visible again.
  delete (crypto as { randomUUID?: unknown }).randomUUID;
});

it('creates sessions on browsers without crypto.randomUUID (Safari < 15.4, insecure origins)', () => {
  Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
  const library = new SessionLibrary(new SafeStorage(memory()));
  const first = library.index.sessions[0];
  const second = library.create('Second');
  expect(first.id).toMatch(/^session-/);
  expect(second.id).toMatch(/^session-/);
  expect(second.id).not.toBe(first.id);
});
