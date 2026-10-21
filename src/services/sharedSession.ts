import { migrate } from '../domain/migrate';
import type { createRpcClient } from './supabase';
export const VIEWER_POLL_MS = 15000;
export async function loadSharedSession(client: ReturnType<typeof createRpcClient>, code: string) {
  const row = await client.read(code);
  if (!row?.payload) throw Error('That session was not found. It may have expired.');
  return { session: migrate(row.payload), updatedAt: row.updated_at || '' };
}
