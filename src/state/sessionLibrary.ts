import { SafeStorage } from './storage';
import { migrate } from '../domain/migrate';
import { serializeState } from '../domain/serialize';
import type { TournamentStateV2, ShareCredentials } from '../domain/types';
export const INDEX_KEY = 'kirq-index-v1';
export const sessionKey = (id: string) => `kirq-session-${id}`;
export const defaultSessionName = () =>
  new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
export interface SessionEntry {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}
export interface SessionIndex {
  activeId: string;
  sessions: SessionEntry[];
}
export class SessionLibrary {
  index: SessionIndex;
  constructor(readonly storage: SafeStorage) {
    const saved = storage.read(INDEX_KEY) as SessionIndex | null;
    if (
      saved &&
      Array.isArray(saved.sessions) &&
      saved.sessions.length &&
      saved.sessions.every((e) => e && typeof e.id === 'string' && typeof e.name === 'string')
    ) {
      this.index = { ...saved, sessions: [...saved.sessions] };
      if (!saved.sessions.some((e) => e.id === saved.activeId))
        this.index.activeId = saved.sessions[0].id;
    } else {
      const entry = this.entry(defaultSessionName());
      this.index = { activeId: entry.id, sessions: [entry] };
      const legacy = storage.read('kirkorino-pickleball-session-v1');
      if (legacy) {
        entry.name = 'Session 1';
        storage.write(sessionKey(entry.id), {
          ...serializeState(migrate(legacy)),
          share: storage.read('kirq-share-v1'),
        });
      }
      this.saveIndex();
    }
  }
  private entry(name: string): SessionEntry {
    // randomUUID is missing on Safari < 15.4 and on insecure (http) origins.
    const unique =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return {
      id: `session-${unique}`,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
  saveIndex() {
    this.storage.write(INDEX_KEY, this.index);
  }
  load(id: string) {
    const raw = this.storage.read(sessionKey(id)) as Record<string, unknown> | null;
    const share = raw?.share as ShareCredentials | null;
    return {
      session: migrate(raw),
      share:
        share && typeof share.code === 'string' && typeof share.editToken === 'string'
          ? share
          : null,
    };
  }
  save(id: string, session: TournamentStateV2, share: ShareCredentials | null) {
    this.storage.write(sessionKey(id), {
      ...serializeState(session),
      savedAt: new Date().toISOString(),
      share,
    });
    this.index = {
      ...this.index,
      sessions: this.index.sessions.map((e) => (e.id === id ? { ...e, updatedAt: Date.now() } : e)),
    };
    this.saveIndex();
  }
  create(name: string) {
    const e = this.entry(name.trim().slice(0, 60) || defaultSessionName());
    this.index = { activeId: e.id, sessions: [...this.index.sessions, e] };
    this.saveIndex();
    return e;
  }
  switch(id: string) {
    if (!this.index.sessions.some((e) => e.id === id)) return false;
    this.index = { ...this.index, activeId: id };
    this.saveIndex();
    return true;
  }
  rename(id: string, name: string) {
    const clean = name.trim().slice(0, 60);
    if (!clean) return false;
    this.index = {
      ...this.index,
      sessions: this.index.sessions.map((e) => (e.id === id ? { ...e, name: clean } : e)),
    };
    this.saveIndex();
    return true;
  }
  delete(id: string) {
    if (this.index.sessions.length < 2 || !this.index.sessions.some((e) => e.id === id))
      return false;
    const sessions = this.index.sessions.filter((e) => e.id !== id);
    this.index = {
      sessions,
      activeId: this.index.activeId === id ? sessions[0].id : this.index.activeId,
    };
    this.saveIndex();
    this.storage.remove(sessionKey(id));
    return true;
  }
}
