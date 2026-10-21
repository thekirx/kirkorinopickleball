import { useState } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { createSessionStore, getDefaultStore, type SessionStore } from './state/sessionStore';
import { createRpcClient } from './services/supabase';
import { useSharing } from './services/useSharing';
import { ApplicationContext, Status } from './features/common';
import { RosterPanel } from './features/roster/RosterPanel';
import { SetupPanel } from './features/setup/SetupPanel';
import { CourtsPanel } from './features/courts/CourtsPanel';
import { QueuePanel } from './features/queue/QueuePanel';
import { LeaderboardPanel } from './features/standings/LeaderboardPanel';
import { HistoryPanel } from './features/history/HistoryPanel';
import { SessionBar } from './features/sessions/SessionBar';
import { SharePanel } from './features/share/SharePanel';
import { PrintReport } from './features/reports/PrintReport';
const defaultRpc = createRpcClient();
const memoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export default function App({
  store: providedStore,
  sharedCode,
  rpc = defaultRpc,
}: {
  store?: StoreApi<SessionStore>;
  sharedCode?: string;
  rpc?: ReturnType<typeof createRpcClient>;
}) {
  const [code] = useState(() => sharedCode ?? new URLSearchParams(window.location.search).get('s'));
  const [store] = useState(
    () => providedStore ?? (code ? createSessionStore(memoryStorage) : getDefaultStore()),
  );
  const state = useStore(store),
    [message, notify] = useState('');
  const sharing = useSharing(store, rpc, code, notify);
  const viewer = Boolean(code);
  const data = viewer ? sharing.view : state.session;
  return (
    <ApplicationContext.Provider
      value={{ data, store: state, viewer, run: state.act, message, notify }}
    >
      <div className={viewer ? 'is-viewer' : ''}>
        <div className="brand-bar">
          <span className="brand-mark">
            KO<sup>®</sup>
          </span>
          <span className="brand-meta">
            <span className="hide-narrow">Court Session Manager&nbsp;&nbsp;/&nbsp;&nbsp;</span>
            <a href="https://kirkorino.com" target="_blank" rel="noopener noreferrer">
              kirkorino.com ↗
            </a>
          </span>
        </div>
        <header className="app-header">
          <h1>
            Kir<span className="accent">Q</span>
          </h1>
          <div className="header-foot">
            <p>
              Fair rotations, balanced teams and a printable record for every open-play session.
            </p>
            <span className="header-tag">
              Manila, PH
              <br />
              Built by Kirk Orino
            </span>
          </div>
        </header>
        {viewer ? (
          <div className="viewer-banner">
            <strong>Live view</strong>
            <span>
              {sharing.updated
                ? `Updated ${new Date(sharing.updated).toLocaleTimeString()}`
                : 'Read-only. Standings update as the scorekeeper records results.'}
            </span>
          </div>
        ) : (
          <SessionBar />
        )}
        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            {Array.from({ length: 2 }, (_, i) =>
              [
                'Queue Priority',
                'Balanced Teams',
                'Teammate Limits',
                'Live Scoring',
                'Saved Locally',
                'PDF Reports',
              ].map((text) => <span key={`${i}${text}`}>{text}</span>),
            )}
          </div>
        </div>
        {state.loadError ? (
          <div className="load-error" role="alert">
            {state.loadError} Your saved session has been preserved.
          </div>
        ) : null}
        <div className="app-layout">
          {!viewer ? <RosterPanel /> : null}
          <main className="main-content">
            <SharePanel
              status={sharing.status}
              publish={sharing.publish}
              refresh={sharing.refresh}
            />
            {!viewer ? <SetupPanel /> : null}
            <Status message={message || sharing.viewError} />
            {!viewer && state.persistenceWarning ? (
              <div role="alert" className="status-message show warning">
                {state.persistenceWarning}
              </div>
            ) : null}
            <CourtsPanel />
            <QueuePanel />
            <LeaderboardPanel />
            <HistoryPanel />
          </main>
        </div>
      </div>
      <PrintReport state={data} />
    </ApplicationContext.Provider>
  );
}
