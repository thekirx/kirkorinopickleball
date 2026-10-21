import { useEffect, useRef, useState, useCallback } from 'react';
import type { StoreApi } from 'zustand';
import type { SessionStore } from '../state/sessionStore';
import { serializeState } from '../domain/serialize';
import { migrate } from '../domain/migrate';
import { createSyncManager, type SyncStatus } from './syncManager';
import { loadSharedSession, VIEWER_POLL_MS } from './sharedSession';
import type { createRpcClient } from './supabase';
export const EXPIRED_MESSAGE =
  'This share link has expired. Publish again to get a new QR code; the old code no longer works.';
/** kirq_update_session raises this when the code is unknown, expired, or the token is wrong. */
export function isExpiredShareError(error: unknown) {
  return /session not found, expired, or edit token rejected/i.test(
    error instanceof Error ? error.message : String(error),
  );
}
export function useSharing(
  store: StoreApi<SessionStore>,
  rpc: ReturnType<typeof createRpcClient>,
  code: string | null,
  notify: (s: string) => void,
) {
  const [status, setStatus] = useState<SyncStatus>('idle'),
    [view, setView] = useState(() => migrate(null)),
    [updated, setUpdated] = useState(''),
    [viewError, setViewError] = useState('');
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  type Job = {
    sessionId: string;
    code: string;
    token: string;
    payload: ReturnType<typeof serializeState>;
  };
  // The manager lives exactly as long as the effect that owns it. A memoized
  // manager would be disposed by StrictMode's mount/cleanup/mount cycle and then
  // reused, silently dropping every later write.
  const managerRef = useRef<ReturnType<typeof createSyncManager<Job>> | null>(null);
  useEffect(() => {
    if (code) return;
    const manager = createSyncManager<Job>(
      (job) => rpc.update(job.code, job.token, job.payload),
      setStatus,
      (job) => job.code,
      isExpiredShareError,
      (job) => {
        store.getState().clearShare(job.sessionId, job.code);
        notifyRef.current(EXPIRED_MESSAGE);
      },
    );
    managerRef.current = manager;
    const queue = () => {
      const s = store.getState();
      if (s.share && !s.loadError)
        manager.schedule({
          sessionId: s.sessionId,
          code: s.share.code,
          token: s.share.editToken,
          payload: serializeState(s.session),
        });
    };
    const unsubscribe = store.subscribe((s, previous) => {
      if (s.session !== previous.session || s.share !== previous.share) queue();
    });
    queue();
    const online = () => {
      void manager.retry();
    };
    window.addEventListener('online', online);
    return () => {
      unsubscribe();
      window.removeEventListener('online', online);
      manager.dispose();
      if (managerRef.current === manager) managerRef.current = null;
    };
  }, [store, rpc, code]);
  const refreshView = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!code) return;
      try {
        const result = await loadSharedSession(rpc, code);
        if (signal?.cancelled) return;
        setView(result.session);
        setUpdated(result.updatedAt);
        setViewError('');
      } catch (error) {
        if (!signal?.cancelled) setViewError((error as Error).message);
      }
    },
    [rpc, code],
  );
  useEffect(() => {
    if (!code) return;
    const signal = { cancelled: false };
    let busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try {
        await refreshView(signal);
      } finally {
        busy = false;
      }
    };
    void refresh();
    const id = setInterval(() => void refresh(), VIEWER_POLL_MS);
    return () => {
      signal.cancelled = true;
      clearInterval(id);
    };
  }, [code, refreshView]);
  async function publish() {
    const before = store.getState();
    const row = await rpc.create(serializeState(before.session));
    if (!row?.code || !row.edit_token) throw Error('The server did not return a share code.');
    // Publishing can finish after a session switch: retain the original session's credentials.
    const stored = before.setShare({ code: row.code, editToken: row.edit_token }, before.sessionId);
    if (!stored) throw Error('The session was deleted while publishing.');
    setStatus('synced');
    notifyRef.current(
      'Published. Anyone who scans the code sees live standings; only this device can change them.',
    );
  }
  async function refresh() {
    if (code) {
      await refreshView();
      return;
    }
    const s = store.getState();
    if (!s.share) {
      notifyRef.current('Nothing published yet.');
      return;
    }
    const manager = managerRef.current;
    if (!manager) return;
    manager.schedule({
      sessionId: s.sessionId,
      code: s.share.code,
      token: s.share.editToken,
      payload: serializeState(s.session),
    });
    await manager.retry();
  }
  return { status, view, viewError, updated, publish, refresh };
}
