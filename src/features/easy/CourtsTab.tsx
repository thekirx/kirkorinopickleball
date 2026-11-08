import { DraftGames } from './DraftGames';
import { NextPlayers } from './NextPlayers';
import { useState } from 'react';
import type { ActiveMatch, Player } from '../../domain/types';
import { createEngine } from '../../domain/engine';
import { useApplication } from '../common';
import { useRoundControls } from '../play/RoundControls';
import { Icon, plural } from './ui';
import { NextGameButton, ReadyCourt } from './NextGame';
import { AddPlayerForm } from './players';
import { ArrangeBoard } from './Arrange';
import { SwapPlayers } from './SwapPlayers';

// PROTOTYPE (easy mode) — Option C, Courts tab.

const teamName = (players: Player[]) => players.map((p) => p.name).join(' & ');

export function CourtCard({ match, index }: { match: ActiveMatch; index: number }) {
  const { run, notify, viewer } = useApplication();
  const [swapping, setSwapping] = useState(false);
  const finished = match.status === 'finished';
  const court = index + 1;
  const showSwap = swapping && !finished && !viewer;

  function tap(side: 'A' | 'B') {
    const name = teamName(side === 'A' ? match.sideA : match.sideB);
    if (finished && match.winnerSide === side) {
      run((e) => e.clearResult(match.id));
      notify(`Court ${court}: result cleared.`);
      return;
    }
    run((e) => {
      if (finished) e.clearResult(match.id);
      e.declareWinner(match.id, side);
    });
    notify(`Court ${court}: ${name} won.`);
  }

  const team = (side: 'A' | 'B', players: Player[]) => {
    const won = finished && match.winnerSide === side;
    const label = teamName(players);
    if (viewer)
      return (
        <div className={`ez-team${won ? ' won' : ''}`}>
          <span className="ez-names">{label}</span>
          {won ? (
            <span className="ez-mark">
              <Icon name="check" /> Won
            </span>
          ) : null}
        </div>
      );
    return (
      <button
        className={`ez-team${won ? ' won' : ''}`}
        aria-pressed={won}
        onClick={() => tap(side)}
      >
        <span className="ez-names">{label}</span>
        <span className="ez-mark">
          {won ? (
            <>
              <Icon name="check" /> Won
            </>
          ) : finished ? (
            ''
          ) : (
            'Tap if they won'
          )}
        </span>
      </button>
    );
  };

  return (
    <article className="ez-card" aria-label={`Court ${court}`}>
      <div className="ez-court-head">
        <h3>Court {court}</h3>
        <span className={`ez-tag ${finished ? 'done' : 'live'}`}>
          {finished ? (
            <>
              <Icon name="check" /> Finished
            </>
          ) : (
            'Playing'
          )}
        </span>
      </div>
      {showSwap ? (
        <SwapPlayers match={match} onDone={() => setSwapping(false)} />
      ) : (
        <>
          <span className="ez-team-label">Team A</span>
          {team('A', match.sideA)}
          <div className="ez-vs">vs</div>
          <span className="ez-team-label">Team B</span>
          {team('B', match.sideB)}
          {!viewer ? (
            <p className="ez-court-hint">
              {finished
                ? 'Tapped the wrong team? Tap the other one, or tap again to clear.'
                : 'When the game ends, tap the team that won.'}
            </p>
          ) : null}
          {finished ? <NextGameButton court={court} /> : null}
        </>
      )}
      {!viewer && !finished && !showSwap ? (
        <>
          <button
            className="ez-btn block"
            aria-expanded={swapping}
            onClick={() => setSwapping(!swapping)}
          >
            <Icon name="swap" /> Swap players
          </button>
        </>
      ) : null}
    </article>
  );
}

export function SittingOut() {
  const { data } = useApplication();
  const inRound = new Set(
    data.activeMatches
      .filter((m) => m.status !== 'finished')
      .flatMap((m) => [...m.sideA, ...m.sideB].map((p) => p.id)),
  );
  const sitting = data.waitingPlayerIds.flatMap((id) => {
    const player = data.players.find((p) => p.id === id);
    return player ? [player] : [];
  });
  const resting = data.players.filter((p) => !p.active);
  return (
    <section className="ez-card" aria-labelledby="sitting-title">
      <h3 id="sitting-title" className="ez-card-title">
        Waiting to play
      </h3>
      <p className="ez-hint">
        Organizer Play next picks go first. Everyone else rotates by who has waited longest; equal
        waits are shuffled.
      </p>
      {sitting.length ? (
        <ol className="ez-next">
          {sitting.map((p, i) => (
            <li key={p.id}>
              <span className="ez-n">{i + 1}</span>
              <span className="ez-who">{p.name}</span>
              <span className="ez-hint">
                {p.roundsWaited
                  ? `waited ${plural(p.roundsWaited, 'turn', 'turns')}`
                  : p.lastPlayedRound === null
                    ? 'just arrived'
                    : 'ready again'}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ez-hint">
          Nobody else is waiting. Players are playing, in an upcoming game, or on a break.
        </p>
      )}
      {resting.length ? (
        <p className="ez-hint">On a break: {resting.map((p) => p.name).join(', ')}</p>
      ) : null}
    </section>
  );
}

export function CourtsTab({ onEditSettings }: { onEditSettings: () => void }) {
  const { data, viewer } = useApplication();
  const { type, courts } = useRoundControls();
  const [arranging, setArranging] = useState(false);
  const engine = createEngine(data);
  const maximum = Math.max(
    viewer ? 0 : courts,
    ...data.activeMatches.map(engine.getCourtNumber),
    ...data.matchLog.map((entry) => entry.court),
  );
  const courtNumbers = Array.from({ length: maximum }, (_, index) => index + 1);
  return (
    <div className="ez-courts-layout">
      {!viewer ? (
        <div className="ez-settings-line">
          <span>
            {plural(courts, 'court', 'courts')} · {type === 'doubles' ? 'Doubles' : 'Singles'}
          </span>
          <span className="ez-settings-actions">
            {data.activeMatches.some((m) => m.status !== 'finished') && !arranging ? (
              <button className="ez-link" onClick={() => setArranging(true)}>
                Move players (drag or tap)
              </button>
            ) : null}
            <button className="ez-link" onClick={onEditSettings}>
              Change
            </button>
          </span>
        </div>
      ) : null}
      {!viewer && !arranging ? (
        <div className="ez-play-guide" role="note">
          <strong>Playing now</strong>
          <span>
            Tap the winning team when a game ends. KirQ picks the next players and balances the
            teams.
          </span>
        </div>
      ) : null}
      {arranging && !viewer ? <ArrangeBoard onDone={() => setArranging(false)} /> : null}
      {arranging && !viewer ? null : (
        <div className="ez-pad ez-courts-body">
          <div className="ez-courts-grid">
            {courtNumbers.length ? (
              courtNumbers.map((court) => {
                const match = data.activeMatches.find((m) => engine.getCourtNumber(m) === court);
                return match ? (
                  <CourtCard key={match.id} match={match} index={court - 1} />
                ) : (
                  <ReadyCourt
                    key={`ready-${court}`}
                    court={court}
                    last={data.matchLog.find((entry) => entry.court === court)}
                  />
                );
              })
            ) : (
              <div className="ez-card">
                <p className="ez-hint">The organizer has not started games yet.</p>
              </div>
            )}
          </div>
          <aside className="ez-courts-side" aria-label="Waiting and arrivals">
            <NextPlayers />
            <SittingOut />
            {!viewer ? (
              // Desktop only: on phones the Players tab is one tap away.
              <section className="ez-card ez-desktop-only" aria-labelledby="arrived-title">
                <h3 id="arrived-title" className="ez-card-title">
                  Someone arrived?
                </h3>
                <AddPlayerForm id="courts-name" compact />
              </section>
            ) : null}
          </aside>
        </div>
      )}
      {!arranging ? <DraftGames /> : null}
    </div>
  );
}
