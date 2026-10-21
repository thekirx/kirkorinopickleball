import type { TournamentStateV2 } from '../../domain/types';
import { createEngine, SKILL_LABELS } from '../../domain/engine';
function Table({
  headers,
  rows,
  numeric,
}: {
  headers: string[];
  rows: (string | number)[][];
  numeric: number;
}) {
  return (
    <table className="report-table">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th className={i >= numeric ? 'report-numeric' : ''} key={h}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((v, j) => (
              <td className={j >= numeric ? 'report-numeric' : ''} key={j}>
                {v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
export function PrintReport({ state }: { state: TournamentStateV2 }) {
  const engine = createEngine(state),
    ranked = engine.getRankedPlayers();
  return (
    <div id="print-report">
      <h1 className="report-title">KirQ Session Report</h1>
      <p className="report-subtitle">Generated {new Date().toLocaleString()}</p>
      <p className="report-meta">
        <span>{state.players.length} player(s)</span>
        <span>
          {Math.max(state.currentRound, ...state.matchLog.map((e) => e.round), 0)} round(s)
        </span>
        <span>{state.matchLog.length} match(es) logged</span>
      </p>
      <h2 className="report-section-title">Final Standings</h2>
      {ranked.length ? (
        <Table
          headers={['Rank', 'Player', 'Skill', 'Wins', 'Losses', 'Win Rate']}
          numeric={3}
          rows={ranked.map((p, i) => [
            `#${i + 1}`,
            p.name,
            SKILL_LABELS[p.skill],
            p.wins,
            p.losses,
            `${engine.getWinRate(p).toFixed(1)}%`,
          ])}
        />
      ) : (
        <p className="report-empty">No players on the roster.</p>
      )}
      <h2 className="report-section-title">Match Results</h2>
      {state.matchLog.length ? (
        <Table
          headers={['Round', 'Court', 'Type', 'Winners', 'Losers', 'Time']}
          numeric={5}
          rows={[...state.matchLog]
            .reverse()
            .map((e) => [
              e.round,
              e.court,
              e.matchType,
              e.winners.join(' & '),
              e.losers.join(' & '),
              new Date(e.finishedAt).toLocaleTimeString(),
            ])}
        />
      ) : (
        <p className="report-empty">No matches have been finished yet.</p>
      )}
      <p className="report-footer">KirQ — Court Session Manager / kirkorino.com</p>
    </div>
  );
}
