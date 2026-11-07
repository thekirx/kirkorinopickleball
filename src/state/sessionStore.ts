import { reconcileQueue, reservedPlayerIds } from '../domain/queue';
import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { SafeStorage, type StorageLike } from './storage';
import { SessionLibrary, type SessionEntry } from './sessionLibrary';
import { migrate } from '../domain/migrate';
import {
  defaultGameDaySettings,
  normalizeGameDaySettings,
  pruneGameDay,
  type GameDaySettings,
} from './gameDay';
import { serializeState } from '../domain/serialize';
import { createEngine } from '../domain/engine';
import type { SessionState, ShareCredentials } from '../domain/types';
const WARNING =
  'This browser blocked local storage, so results will be lost on refresh. Export a backup to keep them.';
export interface SessionStore {
  session: SessionState;
  gameDay: GameDaySettings;
  queueNotice: string;
  setGameDaySettings(patch: Partial<Omit<GameDaySettings, 'nextPlayerIds'>>): void;
  queuePlayer(id: string): { ok: boolean; message: string };
  cancelQueuedPlayer(id: string): void;
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
  /** PROTOTYPE (easy mode): put back an earlier snapshot of the open session (undo). */
  restoreSession(snapshot: SessionState): void;
  clearHistory(): void;
}
export function createSessionStore(storage: StorageLike) {
  const safe = new SafeStorage(storage);
  const library = new SessionLibrary(safe);
  let initial: {
      session: SessionState;
      share: ShareCredentials | null;
      gameDay: GameDaySettings;
    },
    loadError = '';
  try {
    initial = library.load(library.index.activeId);
  } catch (error) {
    loadError = (error as Error).message;
    initial = { session: migrate(null), share: null, gameDay: defaultGameDaySettings() };
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
              queueNotice: '',
            });
          } catch (error) {
            set({ loadError: (error as Error).message });
          }
          warning();
        }
        return {
          ...initial,
          queueNotice: '',
          sessionId: library.index.activeId,
          entries: [...library.index.sessions],
          persistenceWarning: safe.failed ? WARNING : '',
          loadError,
          setGameDaySettings(patch) {
            if (get().loadError) return;
            const gameDay = normalizeGameDaySettings({ ...get().gameDay, ...patch });
            const session = migrate(serializeState(get().session));
            const changed =
              gameDay.type !== get().gameDay.type || gameDay.limit !== get().gameDay.limit;
            const cleared = changed && session.queuedGames.length > 0;
            if (changed) session.queuedGames = [];
            reconcileQueue(session, gameDay.nextPlayerIds);
            set({
              session,
              gameDay: pruneGameDay(gameDay, session),
              queueNotice: cleared ? 'Upcoming games cleared because game settings changed.' : '',
            });
            warning();
          },
          queuePlayer(id) {
            if (get().loadError) return { ok: false, message: 'This game day cannot be edited.' };
            const player = get().session.players.find((p) => p.id === id);
            if (reservedPlayerIds(get().session).has(id))
              return {
                ok: false,
                message: 'This player is already reserved for an upcoming game.',
              };
            if (!player || !player.active)
              return { ok: false, message: 'Choose an active player who is waiting.' };
            if (
              get().session.activeMatches.some(
                (m) => m.status !== 'finished' && [...m.sideA, ...m.sideB].some((p) => p.id === id),
              )
            )
              return {
                ok: false,
                message: `${player.name} is playing now. Finish their game first.`,
              };
            const gameDay = {
              ...get().gameDay,
              nextPlayerIds: [...new Set([...get().gameDay.nextPlayerIds, id])],
            };
            const session = migrate(serializeState(get().session));
            reconcileQueue(session, gameDay.nextPlayerIds);
            set({ session, gameDay, queueNotice: '' });
            warning();
            return { ok: true, message: `${player.name} has the next available queue spot.` };
          },
          cancelQueuedPlayer(id) {
            if (get().loadError) return;
            const gameDay = {
              ...get().gameDay,
              nextPlayerIds: get().gameDay.nextPlayerIds.filter((p) => p !== id),
            };
            const session = migrate(serializeState(get().session));
            reconcileQueue(session, gameDay.nextPlayerIds);
            set({ session, gameDay, queueNotice: '' });
            warning();
          },
          act(action) {
            if (get().loadError) return undefined;
            const draft = migrate(serializeState(get().session));
            const before = get().session.queuedGames;
            const result = action(createEngine(draft));
            reconcileQueue(draft, get().gameDay.nextPlayerIds);
            const remaining = new Set(draft.queuedGames.map((game) => game.id));
            const started = new Set(
              draft.activeMatches
                .filter((match) => match.status !== 'finished')
                .map((match) => match.id),
            );
            const lost = before.filter((game) => !remaining.has(game.id) && !started.has(game.id));
            const explicit = Boolean(
              result && typeof result === 'object' && 'clearedQueue' in result,
            );
            set({
              session: draft,
              gameDay: pruneGameDay(get().gameDay, draft),
              queueNotice:
                lost.length && !explicit
                  ? `${lost.length} upcoming game${lost.length === 1 ? '' : 's'} removed because players became unavailable.`
                  : '',
            });
            warning();
            return result;
          },
          createSession(name) {
            const entry = library.create(name);
            set({
              session: migrate(null),
              gameDay: defaultGameDaySettings(),
              share: null,
              sessionId: entry.id,
              entries: [...library.index.sessions],
              loadError: '',
              queueNotice: '',
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
          restoreSession(snapshot) {
            if (get().loadError) return;
            const session = migrate(serializeState(snapshot));
            reconcileQueue(session, get().gameDay.nextPlayerIds);
            set({ session, gameDay: pruneGameDay(get().gameDay, session), queueNotice: '' });
            warning();
          },
          clearHistory() {
            if (get().loadError) return;
            const draft = migrate(serializeState(get().session));
            draft.matchLog = [];
            reconcileQueue(draft, get().gameDay.nextPlayerIds);
            set({ session: draft, gameDay: pruneGameDay(get().gameDay, draft) });
            warning();
          },
        };
      },
      {
        name: 'kirq-active-v2',
        skipHydration: true,
        partialize: (s) => ({
          session: s.session,
          gameDay: s.gameDay,
          sessionId: s.sessionId,
          share: s.share,
          loadError: s.loadError,
        }),
        storage: {
          getItem: () => null,
          removeItem: () => {},
          setItem: (_key, value) => {
            if (!value.state.loadError)
              library.save(
                value.state.sessionId,
                value.state.session,
                value.state.share,
                value.state.gameDay,
              );
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
