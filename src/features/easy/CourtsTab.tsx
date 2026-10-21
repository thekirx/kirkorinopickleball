import { useEffect, useState } from 'react';
import type { ActiveMatch, Player } from '../../domain/types';
import { createEngine, PLAYER_CHANGE_WINDOW_MS } from '../../domain/engine';
import { useApplication } from '../common';
import { useRoundControls } from '../play/RoundControls';
import { Icon, Sheet, plural } from './ui';
import { AddPlayerForm } from './players';
import { ArrangeBoard } from './Arrange';

// PROTOTYPE (easy mode) — Option C, Courts tab.

const teamName = (players: Player[]) => players.map((p) => p.name).join(' & ');

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function SwapPanel({ match }: { match: ActiveMatch }) {
  const { data, run, notify } = useApplication();
  const now = useNow(true);
  const [picking, setPicking] = useState<string | null>(null);
  const engine = createEngine(data);
  const left = Math.max(0, Math.ceil((match.generatedAt + PLAYER_CHANGE_WINDOW_MS - now) / 1000));
  const canSwap = engine.canChangeMatchPlayer(match, now);
  const players = [...match.sideA, ...match.sideB];
  return (
    <div className="ez-swap">
      <p className="ez-hint">
        {canSwap
          ? `You can swap anyone for the next ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}. After that, only replace someone who got hurt.`
          : 'The first 2 minutes are over. You can still replace someone who got hurt.'}
      </p>
      {players.map((p) => {
        const candidates = engine.getReplacementCandidates(p.id);
        return (
          <div className="ez-swap-row" key={p.id}>
            <span className="ez-who">{p.name}</span>
            {canSwap ? (
              <button
                className="ez-pill"
                disabled={
                  !candidates.length &&
                  !data.activeMatches.some(
                    (m) =>
                      m.id !== match.id &&
                      [...m.sideA, ...m.sideB].some(
                        (o) => !engine.swapBlockReason(p.id, o.id, now),
                      ),
                  )
                }
                aria-expanded={picking === p.id}
                onClick={() => setPicking(picking === p.id ? null : p.id)}
              >
                Swap
              </button>
            ) : null}
            <button
              className="ez-pill"
              disabled={!candidates.length}
              onClick={() => {
                const result = run((e) => e.substituteInjuredPlayer(match.id, p.id));
                if (result)
                  notify(
                    result.ok
                      ? `${result.message} ${p.name} is on a break until they're back.`
                      : result.message,
                  );
              }}
            >
              Got hurt
            </button>
            {picking === p.id ? (
              <div className="ez-swap-pick">
                <p className="ez-hint">Who comes in for {p.name}?</p>
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    className="ez-pill wide"
                    onClick={() => {
                      const result = run((e) => e.replaceMatchPlayer(match.id, p.id, c.id));
                      if (result) notify(result.message);
                      setPicking(null);
                    }}
                  >
                    {c.name}
                  </button>
                ))}
                {(() => {
                  // Same swap as dragging between courts, for people who'd rather tap.
                  const others = data.activeMatches.flatMap((m) =>
                    m.id === match.id ? [] : [...m.sideA, ...m.sideB],
                  );
                  const open = others.filter((o) => !engine.swapBlockReason(p.id, o.id, now));
                  return open.length ? (
                    <>
                      <p className="ez-hint">Or swap with someone on another court</p>
                      {open.map((o) => (
                        <button
                          key={o.id}
                          className="ez-pill wide"
                          onClick={() => {
                            const result = run((e) => e.swapPlayers(p.id, o.id));
                            if (result) notify(result.message);
                            setPicking(null);
                          }}
                        >
                          {o.name}
                        </button>
                      ))}
                    </>
                  ) : null;
                })()}
              </div>
            ) : null}
          </div>
        );
      })}
      {!players.some((p) => engine.getReplacementCandidates(p.id).length) ? (
        <p className="ez-hint">Nobody is sitting out, so there's no one to swap in.</p>
      ) : null}
    </div>
  );
}

export function CourtCard({ match, index }: { match: ActiveMatch; index: number }) {
  const { run, notify, viewer } = useApplication();
  const [swapping, setSwapping] = useState(false);
  const finished = match.status === 'finished';
  const court = index + 1;

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
      {team('A', match.sideA)}
      <div className="ez-vs">vs</div>
      {team('B', match.sideB)}
      {!viewer ? (
        <p className="ez-court-hint">
          {finished
            ? 'Tapped the wrong team? Tap the other one, or tap again to clear.'
            : 'When the game ends, tap the team that won.'}
        </p>
      ) : null}
      {!viewer && !finished ? (
        <>
          <button
            className="ez-link"
            aria-expanded={swapping}
            onClick={() => setSwapping(!swapping)}
          >
            <Icon name="swap" /> {swapping ? 'Done swapping' : 'Swap a player'}
          </button>
          {swapping ? <SwapPanel match={match} /> : null}
        </>
      ) : null}
    </article>
  );
}

export function SittingOut() {
  const { data } = useApplication();
  const inRound = new Set(
    data.activeMatches.flatMap((m) => [...m.sideA, ...m.sideB].map((p) => p.id)),
  );
  const sitting = data.players
    .filter((p) => p.active && !inRound.has(p.id))
    .sort((a, b) => b.roundsWaited - a.roundsWaited || a.name.localeCompare(b.name));
  const resting = data.players.filter((p) => !p.active);
  return (
    <section className="ez-card" aria-labelledby="sitting-title">
      <h3 id="sitting-title" className="ez-card-title">
        Sitting out this round
      </h3>
      <p className="ez-hint">
        Whoever has waited longest goes first next round, so everyone gets fair court time.
      </p>
      {sitting.length ? (
        <ol className="ez-next">
          {sitting.map((p, i) => (
            <li key={p.id}>
              <span className="ez-n">{i + 1}</span>
              <span className="ez-who">{p.name}</span>
              <span className="ez-hint">
                {p.roundsWaited
                  ? `waited ${plural(p.roundsWaited, 'round', 'rounds')}`
                  : 'just arrived'}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ez-hint">Nobody is sitting out. Everyone is on a court.</p>
      )}
      {resting.length ? (
        <p className="ez-hint">On a break: {resting.map((p) => p.name).join(', ')}</p>
      ) : null}
    </section>
  );
}

export function CourtsTab({ onEditSettings }: { onEditSettings: () => void }) {
  const { data, viewer } = useApplication();
  const { type, courts, unfinished, generate } = useRoundControls();
  const [confirming, setConfirming] = useState(false);
  const [arranging, setArranging] = useState(false);
  const openCourts = data.activeMatches
    .map((m, i) => (m.status !== 'finished' ? `Court ${i + 1}` : null))
    .filter(Boolean)
    .join(' and ');
  return (
    <div className="ez-courts-layout">
      {!viewer ? (
        <div className="ez-settings-line">
          <span>
            {plural(courts, 'court', 'courts')} · {type === 'doubles' ? 'Doubles' : 'Singles'}
          </span>
          <span className="ez-settings-actions">
            {data.activeMatches.length && !arranging ? (
              <button className="ez-link" onClick={() => setArranging(true)}>
                Move players
              </button>
            ) : null}
            <button className="ez-link" onClick={onEditSettings}>
              Change
            </button>
          </span>
        </div>
      ) : null}
      {arranging && !viewer ? <ArrangeBoard onDone={() => setArranging(false)} /> : null}
      {arranging && !viewer ? null : (
        <div className="ez-pad ez-courts-body">
          <div className="ez-courts-grid">
            {data.activeMatches.length ? (
              data.activeMatches.map((m, i) => <CourtCard key={m.id} match={m} index={i} />)
            ) : (
              <div className="ez-card">
                <p className="ez-hint">
                  {viewer ? 'The organizer has not started a round yet.' : 'No round right now.'}
                </p>
              </div>
            )}
          </div>
          <aside className="ez-courts-side" aria-label="Waiting and arrivals">
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
      {!viewer && !arranging ? (
        <div className="ez-footer above-tabs">
          {data.activeMatches.length ? (
            <p className="ez-why">
              {unfinished
                ? `${plural(unfinished, 'court is', 'courts are')} still playing. Tap who won first.`
                : 'All games are done. Ready when you are.'}
            </p>
          ) : null}
          <button
            className="ez-btn primary block"
            onClick={() => {
              if (generate() === 'needs-confirm') setConfirming(true);
            }}
          >
            Start next round
          </button>
        </div>
      ) : null}
      {confirming ? (
        <Sheet
          title={`${openCourts} ${unfinished === 1 ? 'is' : 'are'} still playing`}
          onClose={() => setConfirming(false)}
        >
          <p className="ez-warn">
            Starting a new round now ends {unfinished === 1 ? 'that game' : 'those games'} with{' '}
            <b>no result</b>.
          </p>
          <div className="ez-stack">
            <button className="ez-btn primary block" onClick={() => setConfirming(false)}>
              Keep playing
            </button>
            <button
              className="ez-btn block"
              onClick={() => {
                setConfirming(false);
                generate(true);
              }}
            >
              Start new round anyway
            </button>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
