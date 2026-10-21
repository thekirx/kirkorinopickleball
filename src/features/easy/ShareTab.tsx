import { useState } from 'react';
import type { SyncStatus } from '../../services/syncManager';
import { useApplication } from '../common';
import { QrCode } from '../share/QrCode';

// PROTOTYPE (easy mode) — Option C, Share tab. Same publish/sync logic as the
// original share panel, explained in plain words.

const STATUS: Record<SyncStatus, string> = {
  idle: '',
  syncing: 'Updating…',
  synced: 'Live. Phones that scanned it are up to date.',
  offline: "No signal right now. It'll catch up when you're back online.",
  expired: 'That code expired. Create a new one below.',
};

export function ShareTab({
  status,
  publish,
  refresh,
}: {
  status: SyncStatus;
  publish: () => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const { viewer, store, notify } = useApplication();
  const [busy, setBusy] = useState(false);
  const url = viewer
    ? window.location.href
    : store.share
      ? `${window.location.origin}${window.location.pathname}?s=${encodeURIComponent(store.share.code)}`
      : '';
  return (
    <div className="ez-pad">
      <h2>Let everyone follow along</h2>
      <p className="ez-lead">
        {viewer
          ? 'Share this code so others can watch too.'
          : "Anyone who scans the code sees the courts and results live on their own phone. They can't change anything. Your phone keeps working even without signal."}
      </p>
      <div className="ez-two-col ez-share-cols">
        <div>
          {url ? (
            <div className="ez-qr">
              <QrCode url={url} />
            </div>
          ) : null}
        </div>
        <div>
          {!viewer && store.share && STATUS[status] ? (
            <p className="ez-hint" role="status" style={{ textAlign: 'center' }}>
              {STATUS[status]}
            </p>
          ) : null}
          {!viewer && !store.share && status === 'expired' ? (
            <p className="ez-warn">{STATUS.expired}</p>
          ) : null}
          <div className="ez-stack">
            {!viewer && !store.share ? (
              <button
                className="ez-btn primary block"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await publish();
                  } catch (error) {
                    notify(`Couldn't create the code: ${(error as Error).message}`);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Creating…' : 'Create a QR code'}
              </button>
            ) : null}
            {url ? (
              <>
                <label className="ez-sr" htmlFor="share-link">
                  Share link
                </label>
                <input id="share-link" className="ez-input" readOnly value={url} />
                <button
                  className="ez-btn block"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      notify('Link copied. Paste it in your group chat.');
                    } catch {
                      (document.getElementById('share-link') as HTMLInputElement).select();
                      notify('Link selected. Use Copy from your phone menu.');
                    }
                  }}
                >
                  Copy link
                </button>
                <button
                  className="ez-link"
                  onClick={() =>
                    void refresh().catch((e) => notify(`Couldn't refresh: ${e.message}`))
                  }
                >
                  Refresh now
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
