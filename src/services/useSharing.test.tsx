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
it('refreshes printed v1 viewer links every 15 seconds without writing organizer storage', async () => {
  vi.useFakeTimers();
  let reads = 0;
  const rpc = createRpcClient(async () => {
    reads++;
    return new Response(
      JSON.stringify([
        {
          payload: { players: [{ id: 'p', name: 'Player', wins: reads }] },
          updated_at: '2026-10-18T00:00:00Z',
        },
      ]),
    );
  });
  const memory = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const store = createSessionStore(memory);
  const { result } = renderHook(() => useSharing(store, rpc, 'printed-link', () => {}));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(result.current.view.players[0].wins).toBe(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15000);
  });
  expect(reads).toBe(2);
  expect(result.current.view.players[0].wins).toBe(2);
  expect(localStorage.length).toBe(0);
});
it('publishes only safe state and retries the latest offline update on the online event', async () => {
  vi.useFakeTimers();
  const store = createSessionStore(localStorage);
  let offline = true;
  const writes: Record<string, unknown>[] = [];
  const rpc = createRpcClient(async (input, init) => {
    const body = JSON.parse(init!.body as string);
    if (String(input).endsWith('kirq_create_session'))
      return new Response(JSON.stringify([{ code: 'share-code', edit_token: 'private-edit' }]));
    if (offline) throw Error('offline');
    writes.push(body);
    return new Response(JSON.stringify('updated'));
  });
  const { result } = renderHook(() => useSharing(store, rpc, null, () => {}));
  await act(async () => {
    await result.current.publish();
  });
  expect(store.getState().share?.code).toBe('share-code');
  await act(async () => {
    store.getState().act((e) => e.addPlayer('Offline Player', 'pro'));
    await vi.advanceTimersByTimeAsync(900);
  });
  expect(result.current.status).toBe('offline');
  offline = false;
  await act(async () => {
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(writes).toHaveLength(1);
  const payload = writes[0].p_payload as { schemaVersion: number; players: { name: string }[] };
  expect(payload.schemaVersion).toBe(2);
  expect(payload.players[0].name).toBe('Offline Player');
  expect(JSON.stringify(payload)).not.toContain('private-edit');
});
