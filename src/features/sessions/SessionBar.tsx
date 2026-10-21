import { defaultSessionName } from '../../state/sessionLibrary';
import { useApplication } from '../common';
export function SessionBar() {
  const { data, store, notify } = useApplication();
  const entry = store.entries.find((e) => e.id === store.sessionId);
  return (
    <div className="session-bar">
      <div className="session-bar-main">
        <label htmlFor="session-select">Session</label>
        <select
          id="session-select"
          aria-label="Switch session"
          value={store.sessionId}
          onChange={(e) => store.switchSession(e.target.value)}
        >
          {[...store.entries]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.id === store.sessionId
                  ? ` — ${data.players.length} player${data.players.length === 1 ? '' : 's'}, ${data.matchLog.length} match${data.matchLog.length === 1 ? '' : 'es'}`
                  : ''}
              </option>
            ))}
        </select>
      </div>
      <div className="session-bar-actions">
        <button
          className="button button-primary button-small"
          onClick={() =>
            document
              .querySelector('#share-title')
              ?.closest('.panel')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          Share QR
        </button>
        <button
          className="button button-secondary button-small"
          onClick={() => {
            const name = window.prompt('Name this session', defaultSessionName());
            if (name !== null) {
              store.createSession(name);
              notify(`Started "${name.trim() || defaultSessionName()}". Add players to begin.`);
            }
          }}
        >
          New
        </button>
        <button
          className="button button-secondary button-small"
          onClick={() => {
            const name = window.prompt('Rename this session', entry?.name);
            if (name !== null && !store.renameSession(name)) notify('Please enter a session name.');
          }}
        >
          Rename
        </button>
        <button
          className="button button-secondary button-small"
          disabled={store.entries.length <= 1}
          onClick={() => {
            if (
              window.confirm(
                `Delete "${entry?.name}"? Its roster and match log are removed from this device. Any share link for it stops updating.`,
              )
            )
              store.deleteSession(store.sessionId);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
