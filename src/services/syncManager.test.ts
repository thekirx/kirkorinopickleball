import { it, expect, vi, afterEach } from 'vitest';
import { createSyncManager } from './syncManager';
import { createRpcClient } from './supabase';
afterEach(() => vi.useRealTimers());
it('retains offline updates for every session while coalescing each session separately', async () => {
  vi.useFakeTimers();
  let offline = true;
  const delivered: { code: string; revision: number }[] = [];
  const manager = createSyncManager(
    async (job: { code: string; revision: number }) => {
      if (offline) throw Error('offline');
      delivered.push(job);
    },
    () => {},
    (job) => job.code,
  );
  manager.schedule({ code: 'A', revision: 1 });
  await vi.advanceTimersByTimeAsync(900);
  manager.schedule({ code: 'B', revision: 1 });
  manager.schedule({ code: 'A', revision: 2 });
  await vi.advanceTimersByTimeAsync(900);
  offline = false;
  await manager.retry();
  expect(delivered).toEqual(
    expect.arrayContaining([
      { code: 'A', revision: 2 },
      { code: 'B', revision: 1 },
    ]),
  );
  expect(delivered).toHaveLength(2);
  manager.dispose();
});
it('uses only the existing RPC paths and keeps tokens out of read requests', async () => {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const client = createRpcClient(async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(init!.body as string) });
    return new Response(
      JSON.stringify([{ code: 'abc', edit_token: 'secret', payload: { players: [] } }]),
      { status: 200 },
    );
  });
  await client.create({ players: [] });
  await client.update('abc', 'secret', { players: [] });
  await client.read('abc');
  expect(requests.map((r) => r.url.split('/').pop())).toEqual([
    'kirq_create_session',
    'kirq_update_session',
    'kirq_read_session',
  ]);
  expect(requests[2].body).toEqual({ p_code: 'abc' });
  expect(requests[1].body.p_edit_token).toBe('secret');
});
it('coalesces updates and retains the latest failed payload until reconnect', async () => {
  vi.useFakeTimers();
  let offline = true;
  const delivered: number[] = [];
  const manager = createSyncManager(async (n: number) => {
    if (offline) throw Error('offline');
    delivered.push(n);
  });
  manager.schedule(1);
  manager.schedule(2);
  await vi.advanceTimersByTimeAsync(900);
  expect(delivered).toEqual([]);
  expect(manager.status()).toBe('offline');
  offline = false;
  await manager.retry();
  expect(delivered).toEqual([2]);
  manager.dispose();
});
it('never overlaps writes and delivers a later update after an in-flight request', async () => {
  vi.useFakeTimers();
  let release!: () => void;
  const writes: number[] = [];
  const manager = createSyncManager(async (n: number) => {
    writes.push(n);
    if (n === 1) await new Promise<void>((r) => (release = r));
  });
  manager.schedule(1);
  await vi.advanceTimersByTimeAsync(900);
  manager.schedule(2);
  await vi.advanceTimersByTimeAsync(900);
  expect(writes).toEqual([1]);
  release();
  await vi.advanceTimersByTimeAsync(0);
  expect(writes).toEqual([1, 2]);
  manager.dispose();
});
