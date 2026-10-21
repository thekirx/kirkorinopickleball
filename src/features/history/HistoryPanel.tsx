import {
  buildHistoryCsv,
  buildBackupJson,
  downloadFile,
  fileStamp,
  printReport,
} from '../../lib/exports';
import { Panel, Empty, useApplication } from '../common';
export function HistoryPanel() {
  const { data, store, viewer, notify } = useApplication();
  return (
    <Panel
      id="history-title"
      eyebrow="08 / Records"
      title="Match History"
      note={
        data.matchLog.length
          ? `${data.matchLog.length} match${data.matchLog.length === 1 ? '' : 'es'} logged`
          : 'No matches logged yet.'
      }
      actions={
        <>
          <button
            className="button button-primary button-small"
            onClick={() => {
              printReport();
              notify(
                'Choose "Save as PDF" as the destination in the print dialog to save the report.',
              );
            }}
          >
            Export PDF
          </button>
          {!viewer ? (
            <>
              <button
                className="button button-secondary button-small"
                onClick={() => {
                  if (!data.matchLog.length) {
                    notify('There are no logged matches to export yet.');
                    return;
                  }
                  downloadFile(
                    `kirq-matches-${fileStamp()}.csv`,
                    'text/csv;charset=utf-8',
                    buildHistoryCsv(data),
                  );
                  notify('Match log exported as CSV.');
                }}
              >
                Export CSV
              </button>
              <button
                className="button button-secondary button-small"
                onClick={() => {
                  downloadFile(
                    `kirq-session-${fileStamp()}.json`,
                    'application/json',
                    buildBackupJson(data),
                  );
                  notify('Full session backup downloaded.');
                }}
              >
                Export Backup
              </button>
              <button
                className="button button-secondary button-small"
                onClick={() => {
                  if (!data.matchLog.length) {
                    notify('The match log is already empty.');
                    return;
                  }
                  if (
                    window.confirm(
                      'Clear the match log? Player win/loss records and the leaderboard are not affected.',
                    )
                  ) {
                    store.clearHistory();
                    notify('Match log cleared.');
                  }
                }}
              >
                Clear Log
              </button>
            </>
          ) : null}
        </>
      }
    >
      <p className="section-note">
        Results are saved in this browser automatically, so the log survives a refresh.
      </p>
      <ol className="history-list">
        {data.matchLog.length ? (
          data.matchLog.map((e) => (
            <li className="history-item" key={e.id}>
              <span className="history-round">
                Round {e.round} • Court {e.court}
              </span>
              <div className="history-result">
                <strong>
                  {e.winners.join(' & ')} def. {e.losers.join(' & ')}
                </strong>
                <span>{e.matchType}</span>
              </div>
              <span className="history-time">{new Date(e.finishedAt).toLocaleString()}</span>
            </li>
          ))
        ) : (
          <li>
            <Empty>Finished matches are logged here automatically.</Empty>
          </li>
        )}
      </ol>
    </Panel>
  );
}
