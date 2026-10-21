import { createEngine } from '../../domain/engine';
import { Panel, Empty, useApplication } from '../common';
export function LeaderboardPanel() {
  const { data } = useApplication(),
    engine = createEngine(data),
    players = engine.getRankedPlayers();
  return (
    <Panel
      id="leaderboard-title"
      eyebrow="07 / Standings"
      title="Leaderboard"
      note="Ranked by wins, then win rate, then fewer losses."
    >
      <div className="leaderboard-header" aria-hidden="true">
        {['Rank', 'Player', 'Wins', 'Losses', 'Win Rate'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <ol className="leaderboard-list">
        {players.length ? (
          players.map((p, i) => (
            <li className="leaderboard-row" key={p.id}>
              <span className="leaderboard-number">#{i + 1}</span>
              <span className="leaderboard-name">{p.name}</span>
              <span className="leaderboard-stat" data-label="Wins">
                {p.wins}
              </span>
              <span className="leaderboard-stat" data-label="Losses">
                {p.losses}
              </span>
              <span className="leaderboard-stat" data-label="Win Rate">
                {engine.getWinRate(p).toFixed(1)}%
              </span>
            </li>
          ))
        ) : (
          <li>
            <Empty>Add players to begin the leaderboard.</Empty>
          </li>
        )}
      </ol>
    </Panel>
  );
}
