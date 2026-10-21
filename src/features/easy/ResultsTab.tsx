import { useState } from 'react';
import { createEngine } from '../../domain/engine';
import {
  buildBackupJson,
  buildHistoryCsv,
  downloadFile,
  fileStamp,
  printReport,
} from '../../lib/exports';
import { useApplication } from '../common';
import { Sheet } from './ui';

// PROTOTYPE (easy mode) — Option C, Results tab.

export function ResultsTab() {
  const { data, store, viewer, notify } = useApplication();
  const [clearing, setClearing] = useState(false);
  const ranked = createEngine(data).getRankedPlayers();
  const anyGames = data.matchLog.length > 0 || data.players.some((p) => p.wins || p.losses);
  return (
    <div className="ez-pad">
      <h2>Results so far</h2>
      <div className="ez-two-col">
        <section aria-label="Standings section">
          {anyGames ? (
            <ol className="ez-standings" aria-label="Standings">
              {ranked.map((p, i) => (
                <li key={p.id}>
                  <span className="ez-rank">{i + 1}</span>
                  <span className="ez-who">{p.name}</span>
                  <span className="ez-rec">
                    {p.wins} won · {p.losses} lost
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ez-hint">
              No games finished yet. Results appear here as you tap winners.
            </p>
          )}
        </section>
        <section aria-label="Recent games and downloads">
          {data.matchLog.length ? (
            <>
              <h3 className="ez-card-title ez-section-gap">Recent games</h3>
              <ul className="ez-games">
                {data.matchLog.map((e) => (
                  <li key={e.id}>
                    <span className="ez-hint">
                      Round {e.round}, Court {e.court}
                    </span>
                    <span>
                      <b>{e.winners.join(' & ')}</b> beat {e.losers.join(' & ')}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className="ez-stack ez-section-gap">
            <button
              className="ez-btn block"
              onClick={() => {
                printReport();
                notify('In the print window, choose "Save as PDF" to keep a copy.');
              }}
            >
              Save results as PDF
            </button>
            {!viewer ? (
              <>
                <button
                  className="ez-btn block"
                  onClick={() => {
                    if (!data.matchLog.length) return notify('No games to export yet.');
                    downloadFile(
                      `kirq-matches-${fileStamp()}.csv`,
                      'text/csv;charset=utf-8',
                      buildHistoryCsv(data),
                    );
                    notify('Spreadsheet (CSV) downloaded.');
                  }}
                >
                  Download spreadsheet (CSV)
                </button>
                <button
                  className="ez-btn block"
                  onClick={() => {
                    downloadFile(
                      `kirq-session-${fileStamp()}.json`,
                      'application/json',
                      buildBackupJson(data),
                    );
                    notify('Backup file downloaded.');
                  }}
                >
                  Download a backup
                </button>
                <button
                  className="ez-link"
                  disabled={!data.matchLog.length}
                  onClick={() => setClearing(true)}
                >
                  Clear the list of recent games
                </button>
              </>
            ) : null}
          </div>
        </section>
      </div>
      {clearing ? (
        <Sheet title="Clear recent games?" onClose={() => setClearing(false)}>
          <p className="ez-hint">
            This empties the list of recent games. Everyone's won and lost totals stay as they are.
          </p>
          <div className="ez-stack">
            <button className="ez-btn primary block" onClick={() => setClearing(false)}>
              Keep the list
            </button>
            <button
              className="ez-btn danger block"
              onClick={() => {
                store.clearHistory();
                setClearing(false);
                notify('Recent games cleared.');
              }}
            >
              Clear it
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
