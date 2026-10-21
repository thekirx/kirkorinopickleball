import { it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { createSessionStore } from '../state/sessionStore';
import { createRpcClient } from './supabase';
import { createSyncManager } from './syncManager';
import { useSharing, EXPIRED_MESSAGE, isExpiredShareError } from './useSharing';

const EXPIRED_BODY = JSON.stringify({
  code: 'P0001',
  details: null,
  hint: null,
  message: 'KirQ session not found, expired, or edit token rejected',
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

it('recognises only the server expiry rejection as permanent', () => {
  expect(
    isExpiredShareError(Error('KirQ session not found, expired, or edit token rejected')),
  ).toBe(true);
  expect(isExpiredShareError(Error('Failed to fetch'))).toBe(false);
  expect(isExpiredShareError(Error('KirQ payload too large'))).toBe(false);
});

it('drops a permanently rejected job instead of retrying it as offline', async () => {
  const statuses: string[] = [];
  const dropped: string[] = [];
  let sends = 0;
  const manager = createSyncManager<string>(
    async () => {
      sends++;
      throw Error('KirQ session not found, expired, or edit token rejected');
    },
    (s) => statuses.push(s),
    (v) => v,
    isExpiredShareError,
    (v) => dropped.push(v),
  );
  manager.schedule('code-a');
  await manager.retry();
  await manager.retry(); // nothing left: must not resend
  expect(sends).toBe(1);
  expect(dropped).toEqual(['code-a']);
  expect(statuses).toContain('expired');
  expect(statuses).not.toContain('offline');
  expect(manager.status()).toBe('expired');
});

it('clears an expired share, tells the organizer, and lets them publish a fresh QR code', async () => {
  vi.useFakeTimers();
  const store = createSessionStore(localStorage);
  const messages: string[] = [];
  let creates = 0;
  let expired = true;
  const rpc = createRpcClient(async (input) => {
    if (String(input).endsWith('kirq_create_session')) {
      creates++;
      return new Response(
        JSON.stringify([{ code: `code-${creates}`, edit_token: `token-${creates}` }]),
      );
    }
    if (expired) return new Response(EXPIRED_BODY, { status: 400 });
    return new Response(JSON.stringify('updated'));
  });
  const { result } = renderHook(() => useSharing(store, rpc, null, (m) => messages.push(m)));
  await act(async () => {
    await result.current.publish();
  });
  expect(store.getState().share?.code).toBe('code-1');

  await act(async () => {
    store.getState().act((e) => e.addPlayer('Late Player', 'pro'));
    await vi.advanceTimersByTimeAsync(900);
  });
  expect(store.getState().share).toBeNull();
  expect(result.current.status).toBe('expired');
  expect(messages).toContain(EXPIRED_MESSAGE);
  // persisted too: a reload must not resurrect the dead credentials
  const saved = JSON.parse(localStorage.getItem(`kirq-session-${store.getState().sessionId}`)!);
  expect(saved.share).toBeNull();

  expired = false;
  await act(async () => {
    await result.current.publish();
  });
  expect(store.getState().share?.code).toBe('code-2');
  expect(result.current.status).toBe('synced');
});

it('never clears a newer publish when an older share fails late', () => {
  const store = createSessionStore(localStorage);
  const id = store.getState().sessionId;
  store.getState().setShare({ code: 'new-code', editToken: 'new-token' }, id);
  store.getState().clearShare(id, 'old-code');
  expect(store.getState().share?.code).toBe('new-code');
});

it('clears the expired share of a background session without touching the open one', () => {
  const store = createSessionStore(localStorage);
  const first = store.getState().sessionId;
  store.getState().setShare({ code: 'first-code', editToken: 't1' }, first);
  store.getState().createSession('Second');
  const second = store.getState().sessionId;
  store.getState().setShare({ code: 'second-code', editToken: 't2' }, second);

  store.getState().clearShare(first, 'first-code');

  expect(store.getState().sessionId).toBe(second);
  expect(store.getState().share?.code).toBe('second-code');
  const firstSaved = JSON.parse(localStorage.getItem(`kirq-session-${first}`)!);
  expect(firstSaved.share).toBeNull();
});
