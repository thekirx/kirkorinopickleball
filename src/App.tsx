import { useCallback, useState } from 'react';
import { useStore, type StoreApi } from 'zustand';
import { createSessionStore, getDefaultStore, type SessionStore } from './state/sessionStore';
import { createRpcClient } from './services/supabase';
import { useSharing } from './services/useSharing';
import { ApplicationContext } from './features/common';
import { PrintReport } from './features/reports/PrintReport';
import { RoundControlsProvider } from './features/play/RoundControls';
import { EasyApp } from './features/easy/EasyApp';
import { Toast } from './features/easy/ui';
import './features/easy/easy.css';

// PROTOTYPE (prototype/play-mode): "easy mode" — Option A guided setup, then
// Option C phone tabs for play. Same store, engine and sharing as Phase 1.

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
  const state = useStore(store);
  const [toast, setToast] = useState<{ text: string; undo?: () => void }>({ text: '' });
  const notify = useCallback((text: string, undo?: () => void) => setToast({ text, undo }), []);
  const clearToast = useCallback(() => setToast({ text: '' }), []);
  const sharing = useSharing(store, rpc, code, notify);
  const viewer = Boolean(code);
  const data = viewer ? sharing.view : state.session;
  return (
    <ApplicationContext.Provider
      value={{ data, store: state, viewer, run: state.act, message: toast.text, notify }}
    >
      <RoundControlsProvider>
        <EasyApp
          status={sharing.status}
          publish={sharing.publish}
          refresh={sharing.refresh}
          updated={sharing.updated}
        />
      </RoundControlsProvider>
      {sharing.viewError ? (
        <div className="ez-warn ez-view-error" role="alert">
          {sharing.viewError}
        </div>
      ) : null}
      <Toast text={toast.text} undo={toast.undo} onDone={clearToast} />
      <PrintReport state={data} />
    </ApplicationContext.Provider>
  );
}
