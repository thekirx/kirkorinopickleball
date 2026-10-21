export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'expired';
export function createSyncManager<T>(
  send: (value: T) => Promise<unknown>,
  onStatus: (status: SyncStatus) => void = () => {},
  keyOf: (value: T) => string = () => 'default',
  // A permanent rejection (e.g. the share expired) must not be retried forever
  // and shown as "offline": drop the job and let the caller recover.
  isPermanent: (error: unknown) => boolean = () => false,
  onPermanent: (value: T, error: unknown) => void = () => {},
) {
  const pending = new Map<string, T>();
  let busy = false,
    disposed = false,
    timer: ReturnType<typeof setTimeout> | undefined,
    status: SyncStatus = 'idle';
  function statusTo(next: SyncStatus) {
    status = next;
    if (!disposed) onStatus(next);
  }
  async function retry() {
    if (disposed || busy || !pending.size) return;
    busy = true;
    statusTo('syncing');
    try {
      while (pending.size && !disposed) {
        const [key, current] = pending.entries().next().value!;
        pending.delete(key);
        try {
          await send(current);
        } catch (error) {
          if (isPermanent(error)) {
            if (!disposed) {
              statusTo('expired');
              onPermanent(current, error);
            }
            continue;
          }
          if (!pending.has(key) && !disposed) pending.set(key, current);
          statusTo('offline');
          return;
        }
      }
      if (!disposed && status !== 'expired') statusTo('synced');
    } finally {
      busy = false;
    }
  }
  return {
    schedule(value: T) {
      if (disposed) return;
      pending.set(keyOf(value), value);
      clearTimeout(timer);
      timer = setTimeout(() => void retry(), 900);
    },
    retry,
    status: () => status,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      pending.clear();
    },
  };
}
