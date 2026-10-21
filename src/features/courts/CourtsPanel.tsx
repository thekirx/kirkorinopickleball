import { useEffect, useState } from 'react';
import type { ActiveMatch, Player } from '../../domain/types';
import { createEngine, SKILL_LABELS, PLAYER_CHANGE_WINDOW_MS } from '../../domain/engine';
import { Panel, Empty, useApplication } from '../common';
function AssignedPlayer({
  match,
  player,
  now,
}: {
  match: ActiveMatch;
  player: Player;
  now: number;
}) {
  const { data, run, notify, viewer } = useApplication();
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState('');
  const candidates = createEngine(data).getReplacementCandidates(player.id);
  const canChange = createEngine(data).canChangeMatchPlayer(match, now);
  return (
    <div className="assigned-player-row">
      <div className="assigned-player">
        {player.name} ({SKILL_LABELS[player.skill]})
      </div>
      {!viewer && match.status !== 'finished' ? (
        <>
          <div className="assigned-player-actions">
            <button
              className="player-match-action change-player-button"
              disabled={!canChange || !candidates.length}
              onClick={() => setOpen(!open)}
            >
              Change Player
            </button>
            <button
              className="player-match-action injury"
              disabled={!candidates.length}
              onClick={() => {
                if (
                  !window.confirm(
                    `Substitute ${player.name} for an injury? The closest-skill waiting player will be assigned, and ${player.name} will be timed out.`,
                  )
                )
                  return;
                const result = run((e) => e.substituteInjuredPlayer(match.id, player.id));
                if (result)
                  notify(
                    result.ok
                      ? `${result.message} The injured player was timed out.`
                      : result.message,
                  );
              }}
            >
              Injury Substitute
            </button>
          </div>
          {open && canChange ? (
            <div className="replacement-picker">
              <select
                aria-label={`Replacement for ${player.name}`}
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              >
                <option value="">Choose waiting player</option>
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {SKILL_LABELS[p.skill]}, waited {p.roundsWaited}
                  </option>
                ))}
              </select>
              <button
                className="player-match-action"
                onClick={() => {
                  if (!selected) {
                    notify('Choose a waiting player first.');
                    return;
                  }
                  const result = run((e) => e.replaceMatchPlayer(match.id, player.id, selected));
                  if (result) {
                    notify(result.message);
                    if (result.ok) setOpen(false);
                  }
                }}
              >
                Apply Change
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
function Court({ match, index }: { match: ActiveMatch; index: number }) {
  const { run, notify, viewer } = useApplication();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(
      0,
      Math.ceil((match.generatedAt + PLAYER_CHANGE_WINDOW_MS - now) / 1000),
    ),
    finished = match.status === 'finished';
  return (
    <article className={`court-card${finished ? ' finished' : ''}`}>
      <div className="court-heading">
        <h3 className="court-title">Court {index + 1}</h3>
        <span className="court-status">
          {finished ? 'Finished' : 'In Progress'}
          {!finished ? (
            <span className="match-change-window">
              {seconds
                ? `Changes close in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
                : 'Standard changes closed'}
            </span>
          ) : null}
        </span>
      </div>
      <div className="match-display">
        {(['A', 'B'] as const).map((side, i) => {
          const players = side === 'A' ? match.sideA : match.sideB,
            label = `${players.length === 2 ? 'Team' : 'Player'} ${side}`,
            winner = finished && match.winnerSide === side;
          return (
            <div key={side}>
              {i ? <div className="versus">VS</div> : null}
              <div className={`side-card${winner ? ' winner' : ''}`}>
                <span className="side-label">{label}</span>
                <div className="team-players">
                  {players.map((p) => (
                    <AssignedPlayer key={p.id} player={p} match={match} now={now} />
                  ))}
                </div>
                {!viewer ? (
                  <button
                    className={`winner-button${winner ? ' confirmed' : ''}`}
                    disabled={finished}
                    onClick={() => {
                      const result = run((e) => e.declareWinner(match.id, side));
                      if (result) notify(result.message);
                    }}
                  >
                    {winner
                      ? 'Winner Recorded'
                      : finished
                        ? 'Match Finished'
                        : `Declare ${label} Winner`}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
export function CourtsPanel() {
  const { data } = useApplication();
  return (
    <Panel
      id="courts-title"
      eyebrow="05 / In Play"
      title="Live Courts"
      note={data.activeMatches.length ? `Round ${data.currentRound}` : 'No round generated yet.'}
    >
      {data.activeMatches.length ? (
        <>
          <div className="summary-bar">
            <span>
              {data.activeMatches.length} court(s) •{' '}
              {data.activeMatches.filter((m) => m.status === 'finished').length} finished
            </span>
            <span>
              {data.activeMatches.reduce((n, m) => n + m.sideA.length + m.sideB.length, 0)} assigned
              player(s)
            </span>
          </div>
          <div className="courts-grid">
            {data.activeMatches.map((m, i) => (
              <Court key={m.id} match={m} index={i} />
            ))}
          </div>
        </>
      ) : (
        <Empty>Add enough players, configure the session, and generate a round.</Empty>
      )}
    </Panel>
  );
}
