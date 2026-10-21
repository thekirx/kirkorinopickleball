import { useEffect, useState } from 'react';
import type { SyncStatus } from '../../services/syncManager';
import { defaultSessionName } from '../../state/sessionLibrary';
import { useApplication } from '../common';
import { SetupFlow } from './SetupFlow';
import { CourtsTab } from './CourtsTab';
import { PlayersTab } from './PlayersTab';
import { ResultsTab } from './ResultsTab';
import { ShareTab } from './ShareTab';
import { Icon, Sheet } from './ui';

// PROTOTYPE (easy mode): Option A for setup, Option C for play.

type Tab = 'courts' | 'players' | 'results' | 'share';
const TABS: [Tab, string, Parameters<typeof Icon>[0]['name']][] = [
  ['courts', 'Courts', 'courts'],
  ['players', 'Players', 'people'],
  ['results', 'Results', 'trophy'],
  ['share', 'Share', 'share'],
];

function SessionsSheet({ onClose }: { onClose: () => void }) {
  const { store, notify } = useApplication();
  // Two game days on the same date would otherwise share a name and look identical.
  const [newName, setNewName] = useState(() => {
    const base = defaultSessionName();
    const taken = new Set(store.entries.map((e) => e.name));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base} (${n})`)) n += 1;
    return `${base} (${n})`;
  });
  const current = store.entries.find((e) => e.id === store.sessionId);
  const [rename, setRename] = useState(current?.name ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Sheet title="Today's games" onClose={onClose}>
      <p className="ez-hint">Each day or group gets its own list of players and results.</p>
      <ul className="ez-list" aria-label="Saved game days">
        {[...store.entries]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((e) => (
            <li key={e.id}>
              <button
                className="ez-menu-item"
                aria-current={e.id === store.sessionId ? 'true' : undefined}
                onClick={() => {
                  store.switchSession(e.id);
                  onClose();
                }}
              >
                <span className="ez-who">{e.name}</span>
                {e.id === store.sessionId ? <span className="ez-tag live">Open</span> : null}
              </button>
            </li>
          ))}
      </ul>
      <form
        className="ez-add"
        onSubmit={(e) => {
          e.preventDefault();
          store.createSession(newName);
          notify(`Started "${newName.trim() || defaultSessionName()}". Add who's here.`);
          onClose();
        }}
      >
        <label className="ez-sr" htmlFor="new-session">
          Name for a new game day
        </label>
        <input id="new-session" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="ez-btn primary" type="submit">
          Start new
        </button>
      </form>
      <form
        className="ez-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (store.renameSession(rename)) notify('Renamed.');
          else notify('Please type a name.');
        }}
      >
        <label className="ez-sr" htmlFor="rename-session">
          Rename this game day
        </label>
        <input id="rename-session" value={rename} onChange={(e) => setRename(e.target.value)} />
        <button className="ez-btn" type="submit">
          Rename
        </button>
      </form>
      {store.entries.length > 1 ? (
        confirmDelete ? (
          <div className="ez-stack">
            <p className="ez-warn">
              Delete "{current?.name}"? Its players and results are removed from this phone, and its
              QR code stops updating.
            </p>
            <button className="ez-btn block" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
            <button
              className="ez-btn danger block"
              onClick={() => {
                store.deleteSession(store.sessionId);
                notify('Deleted.');
                onClose();
              }}
            >
              Delete it
            </button>
          </div>
        ) : (
          <button className="ez-link danger" onClick={() => setConfirmDelete(true)}>
            Delete this game day
          </button>
        )
      ) : null}
      <button className="ez-btn block" onClick={onClose}>
        Close
      </button>
    </Sheet>
  );
}

export function EasyApp({
  status,
  publish,
  refresh,
  updated,
}: {
  status: SyncStatus;
  publish: () => Promise<void>;
  refresh: () => Promise<void>;
  updated: string;
}) {
  const { data, store, viewer } = useApplication();
  const inPlay = data.currentRound > 0 || data.activeMatches.length > 0;
  const [setup, setSetup] = useState<0 | 1 | null>(inPlay || viewer ? null : 0);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('courts');
  const [sessions, setSessions] = useState(false);

  // A different game day starts where that day is: setup if nothing has been
  // played. Keyed on the session only, deliberately: playing must not bounce
  // the organizer back into setup.
  useEffect(() => {
    if (viewer) return;
    setSetup(inPlay ? null : 0);
    setEditing(false);
    setTab('courts');
  }, [store.sessionId]);

  const currentName = store.entries.find((e) => e.id === store.sessionId)?.name ?? '';
  const top = (
    <header className="ez-top">
      <span className="ez-logo">
        Kir<span>Q</span>
      </span>
      {!viewer ? (
        <button
          className="ez-session"
          onClick={() => setSessions(true)}
          aria-label={`Today's games: ${currentName}`}
        >
          <span>{currentName}</span>
          <Icon name="chevron" />
        </button>
      ) : (
        <span className="ez-spacer" />
      )}
      {data.currentRound ? <span className="ez-tag live">Round {data.currentRound}</span> : null}
    </header>
  );

  const banners = (
    <div className="ez-banners">
      {viewer ? (
        <div className="ez-viewer-banner">
          <b>Live view.</b>{' '}
          {updated ? `Updated ${new Date(updated).toLocaleTimeString()}.` : 'Updates on its own.'}
        </div>
      ) : null}
      {store.loadError ? (
        <div className="ez-warn" role="alert">
          {store.loadError} Your saved games are kept safe.
        </div>
      ) : null}
      {!viewer && store.persistenceWarning ? (
        <div className="ez-warn" role="alert">
          {store.persistenceWarning}
        </div>
      ) : null}
    </div>
  );

  if (!viewer && setup !== null)
    return (
      <div className="easy">
        {top}
        {banners}
        <main>
          <SetupFlow
            step={setup}
            setStep={setSetup}
            editing={editing}
            onDone={() => {
              setSetup(null);
              setEditing(false);
              setTab('courts');
            }}
          />
        </main>
        {sessions ? <SessionsSheet onClose={() => setSessions(false)} /> : null}
      </div>
    );

  const tabs = viewer ? TABS.filter(([k]) => k !== 'players') : TABS;
  return (
    <div className="easy has-tabs">
      {top}
      {banners}
      <nav className="ez-tabbar" aria-label="Sections">
        {tabs.map(([key, label, icon]) => (
          <button
            key={key}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setTab(key)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <main>
        {tab === 'courts' ? (
          <CourtsTab
            onEditSettings={() => {
              setEditing(true);
              setSetup(1);
            }}
          />
        ) : null}
        {tab === 'players' && !viewer ? <PlayersTab /> : null}
        {tab === 'results' ? <ResultsTab /> : null}
        {tab === 'share' ? <ShareTab status={status} publish={publish} refresh={refresh} /> : null}
      </main>
      {sessions ? <SessionsSheet onClose={() => setSessions(false)} /> : null}
    </div>
  );
}
