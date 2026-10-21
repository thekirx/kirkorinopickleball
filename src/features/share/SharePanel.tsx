import { useMemo, useState } from 'react';
import type { SyncStatus } from '../../services/syncManager';
import { encodeQr } from '../../lib/qr';
import { Panel, Empty, useApplication } from '../common';
export function QrCode({ url }: { url: string }) {
  const qr = useMemo(() => encodeQr(url, { ecc: 'M' }), [url]);
  if (!qr) return <Empty>This link is too long to encode.</Empty>;
  const quiet = 2,
    dimension = qr.size + quiet * 2,
    path: string[] = [];
  for (let y = 0; y < qr.size; y++)
    for (let x = 0; x < qr.size; x++)
      if (qr.modules[y][x]) path.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
  return (
    <svg
      viewBox={`0 0 ${dimension} ${dimension}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code for this session's share link"
    >
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path.join('')} fill="#0a0a0a" />
    </svg>
  );
}
const LABELS: Record<SyncStatus, string> = {
  idle: 'Not shared',
  syncing: 'Syncing…',
  synced: 'Live — up to date',
  offline: 'Offline — will retry on reconnect',
  expired: 'Share expired — publish again for a new QR code',
};
export function SharePanel({
  status,
  publish,
  refresh,
}: {
  status: SyncStatus;
  publish: () => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const { viewer, store, notify } = useApplication();
  const [publishing, setPublishing] = useState(false);
  const url = viewer
    ? window.location.href
    : store.share
      ? `${window.location.origin}${window.location.pathname}?s=${encodeURIComponent(store.share.code)}`
      : '';
  return (
    <Panel
      id="share-title"
      eyebrow="03 / Share"
      title="Session QR"
      note={
        viewer
          ? 'Viewing a shared session'
          : store.share
            ? LABELS[status]
            : status === 'expired'
              ? LABELS.expired
              : LABELS.idle
      }
      actions={
        <>
          {!viewer ? (
            <button
              className="button button-primary button-small"
              disabled={publishing || Boolean(store.share)}
              onClick={async () => {
                setPublishing(true);
                try {
                  await publish();
                } catch (error) {
                  notify(`Could not publish: ${(error as Error).message}`);
                } finally {
                  setPublishing(false);
                }
              }}
            >
              {publishing ? 'Publishing…' : store.share ? 'Published' : 'Publish & Get QR'}
            </button>
          ) : null}
          <button
            className="button button-secondary button-small"
            onClick={() => void refresh().catch((e) => notify(`Could not refresh: ${e.message}`))}
          >
            Refresh
          </button>
        </>
      }
    >
      <div className="share-grid">
        <div className="share-qr">
          {url ? (
            <QrCode url={url} />
          ) : (
            <Empty>Publish this session to get a QR code the group can scan.</Empty>
          )}
        </div>
        <div className="share-details">
          <p className="section-note">
            Publishing uploads a copy of this session. Anyone who scans the code sees live standings
            and results, but cannot change anything. Your device stays the scorekeeper and keeps
            working with no signal.
          </p>
          <label htmlFor="share-link">Share link</label>
          <input id="share-link" type="text" readOnly value={url} placeholder="Not published yet" />
          <button
            className="button button-secondary button-small"
            onClick={async () => {
              if (!url) {
                notify('Publish the session first to get a link.');
                return;
              }
              try {
                await navigator.clipboard.writeText(url);
                notify('Share link copied.');
              } catch {
                const input = document.getElementById('share-link') as HTMLInputElement;
                input.select();
                notify('Press copy on the selected link.');
              }
            }}
          >
            Copy link
          </button>
        </div>
      </div>
    </Panel>
  );
}
