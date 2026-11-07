import type { MatchLogEntry } from '../../domain/types';
import { createEngine } from '../../domain/engine';
import { useApplication } from '../common';
import { useRoundControls } from '../play/RoundControls';

export function NextGameButton({ court }: { court: number }) {
  const { data, viewer } = useApplication();
  const { type, courts, startGame } = useRoundControls();
  if (viewer) return null;
  const busy = createEngine(data).getAssignedPlayerIds();
  const available = data.players.filter((p) => p.active && !busy.has(p.id)).length;
  const unavailable = court > courts;
  const next = data.queuedGames[0];
  const needed = (next?.matchType ?? type) === 'doubles' ? 4 : 2;
  return (
    <div className="ez-next-game">
      <p className="ez-hint">
        {unavailable
          ? 'Not in the available court count. Increase courts in Change to use it again.'
          : next
            ? 'Start the first fixed game in Next in queue. Other courts keep playing.'
            : available < needed
              ? `${needed} waiting players needed; ${available} available.`
              : 'Use the next waiting players. Other courts keep playing.'}
      </p>
      <button
        className="ez-btn primary block"
        disabled={unavailable || (!next && available < needed)}
        onClick={() => startGame(court)}
      >
        Start next game
      </button>
    </div>
  );
}

export function ReadyCourt({ court, last }: { court: number; last?: MatchLogEntry }) {
  return (
    <article className="ez-card" aria-label={`Court ${court}`}>
      <div className="ez-court-head">
        <h3>Court {court}</h3>
        <span className="ez-tag done">Ready</span>
      </div>
      {last ? (
        <>
          <p className="ez-hint">Last game · result saved</p>
          <div className="ez-team won">
            <span className="ez-names">{last.winners.join(' & ')}</span>
            <span className="ez-mark">Won</span>
          </div>
          <div className="ez-vs">vs</div>
          <div className="ez-team">
            <span className="ez-names">{last.losers.join(' & ')}</span>
          </div>
        </>
      ) : (
        <p className="ez-hint">Ready for a game.</p>
      )}
      <NextGameButton court={court} />
    </article>
  );
}
