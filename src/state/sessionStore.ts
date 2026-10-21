import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { SafeStorage, type StorageLike } from './storage';
import { SessionLibrary, type SessionEntry } from './sessionLibrary';
import { migrate } from '../domain/migrate';
import { serializeState } from '../domain/serialize';
import { createEngine } from '../domain/engine';
import type { TournamentStateV2, ShareCredentials } from '../domain/types';
const WARNING =
  'This browser blocked local storage, so results will be lost on refresh. Export a backup to keep them.';
export interface SessionStore {
  session: TournamentStateV2;
  sessionId: string;
  share: ShareCredentials | null;
  entries: SessionEntry[];
  persistenceWarning: string;
  loadError: string;
  act<T>(action: (engine: ReturnType<typeof createEngine>) => T): T | undefined;
  createSession(name: string): void;
  switchSession(id: string): void;
  renameSession(name: string): boolean;
  deleteSession(id: string): boolean;
  setShare(share: ShareCredentials, sessionId?: string): boolean;
  clearShare(sessionId: string, code: string): void;
  clearHistory(): void;
}
export function createSessionStore(storage: StorageLike) {
  const safe = new SafeStorage(storage);
  const library = new SessionLibrary(safe);
  let initial: { session: TournamentStateV2; share: ShareCredentials | null },
    loadError = '';
  try {
    initial = library.load(library.index.activeId);
  } catch (error) {
    loadError = (error as Error).message;
    initial = { session: migrate(null), share: null };
  }
  return createStore<SessionStore>()(
    persist(
      (set, get) => {
        function warning() {
          if (safe.failed && !get().persistenceWarning) set({ persistenceWarning: WARNING });
        }
        function load(id: string) {
          try {
            const restored = library.load(id);
            library.switch(id);
            set({
              ...restored,
              sessionId: id,
              entries: [...library.index.sessions],
              loadError: '',
            });
          } catch (error) {
            set({ loadError: (error as Error).message });
          }
          warning();
        }
        return {
          ...initial,
          sessionId: library.index.activeId,
          entries: [...library.index.sessions],
          persistenceWarning: safe.failed ? WARNING : '',
          loadError,
          act(action) {
            if (get().loadError) return undefined;
            const draft = migrate(serializeState(get().session));
            const result = action(createEngine(draft));
            set({ session: draft });
            warning();
            return result;
          },
          createSession(name) {
            const entry = library.create(name);
            set({
              session: migrate(null),
              share: null,
              sessionId: entry.id,
              entries: [...library.index.sessions],
              loadError: '',
            });
            warning();
          },
          switchSession: load,
          renameSession(name) {
            const ok = library.rename(get().sessionId, name);
            if (ok) set({ entries: [...library.index.sessions] });
            warning();
            return ok;
          },
          deleteSession(id) {
            if (!library.delete(id)) return false;
            load(library.index.activeId);
            return true;
          },
          setShare(share, sessionId = get().sessionId) {
            if (!library.index.sessions.some((entry) => entry.id === sessionId)) return false;
            if (sessionId === get().sessionId) {
              if (get().loadError) return false;
              set({ share });
            } else {
              const original = library.load(sessionId);
              library.save(sessionId, original.session, share);
              set({ entries: [...library.index.sessions] });
            }
            warning();
            return true;
          },
          clearShare(sessionId, code) {
            // Only clear if the stored share is still the expired one; a newer
            // publish for the same session must survive a late failure.
            if (sessionId === get().sessionId) {
              if (get().share?.code === code) set({ share: null });
            } else if (library.index.sessions.some((entry) => entry.id === sessionId)) {
              try {
                const original = library.load(sessionId);
                if (original.share?.code === code) library.save(sessionId, original.session, null);
              } catch {
                /* unreadable future-schema session: leave it untouched */
              }
            }
            warning();
          },
          clearHistory() {
            if (get().loadError) return;
            const draft = migrate(serializeState(get().session));
            draft.matchLog = [];
            set({ session: draft });
            warning();
          },
        };
      },
      {
        name: 'kirq-active-v2',
        skipHydration: true,
        partialize: (s) => ({
          session: s.session,
          sessionId: s.sessionId,
          share: s.share,
          loadError: s.loadError,
        }),
        storage: {
          getItem: () => null,
          removeItem: () => {},
          setItem: (_key, value) => {
            if (!value.state.loadError)
              library.save(value.state.sessionId, value.state.session, value.state.share);
          },
        },
      },
    ),
  );
}
let defaultStore: ReturnType<typeof createSessionStore> | undefined;
export const getDefaultStore = () => {
  if (defaultStore) return defaultStore;
  const browserStorage: StorageLike = {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  };
  return (defaultStore = createSessionStore(browserStorage));
};
