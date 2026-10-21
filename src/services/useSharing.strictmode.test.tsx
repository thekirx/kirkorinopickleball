import { StrictMode, type ReactNode } from 'react';
import { it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { createSessionStore } from '../state/sessionStore';
import { createRpcClient } from './supabase';
import { useSharing } from './useSharing';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

it('keeps syncing under React StrictMode (effects mount, clean up, and mount again)', async () => {
  vi.useFakeTimers();
  const store = createSessionStore(localStorage);
  const writes: unknown[] = [];
  const rpc = createRpcClient(async (input, init) => {
    if (String(input).endsWith('kirq_create_session'))
      return new Response(JSON.stringify([{ code: 'share-code', edit_token: 'private-edit' }]));
    writes.push(JSON.parse(init!.body as string));
    return new Response(JSON.stringify('updated'));
  });
  const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
  const { result } = renderHook(() => useSharing(store, rpc, null, () => {}), { wrapper });
  await act(async () => {
    await result.current.publish();
  });
  await act(async () => {
    store.getState().act((e) => e.addPlayer('After StrictMode remount', 'pro'));
    await vi.advanceTimersByTimeAsync(900);
  });
  expect(writes.length).toBeGreaterThan(0);
});
