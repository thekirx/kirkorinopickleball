import { useEffect, useId, useRef, useState } from 'react';
import type { ActiveMatch, Player } from '../../domain/types';
import { createEngine } from '../../domain/engine';
import { useApplication } from '../common';

/** Two explicit choices keep lineup changes separate from recording a winner. */
export function SwapPlayers({ match, onDone }: { match: ActiveMatch; onDone: () => void }) {
  const { data, store, run, notify } = useApplication();
  const [outgoingId, setOutgoingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [outgoingId]);
  const engine = createEngine(data);
  const players = [...match.sideA, ...match.sideB];
  const outgoing = players.find((p) => p.id === outgoingId);
  const waiting = data.waitingPlayerIds.flatMap((id) => {
    const p = data.players.find((p) => p.id === id);
    return p ? [p] : [];
  });
  const upcoming = data.queuedGames.flatMap((game, i) =>
    [...game.sideA, ...game.sideB].flatMap((id) => {
      const player = data.players.find((p) => p.id === id);
      return player ? [{ player, label: `Upcoming game ${i + 1}` }] : [];
    }),
  );
  const playing = data.activeMatches
    .filter((m) => m.status !== 'finished')
    .flatMap((m) =>
      [...m.sideA, ...m.sideB].map((player) => ({
        player,
        label: `Court ${engine.getCourtNumber(m)}`,
      })),
    );
  const options = [
    ...waiting.map((player) => ({ player, label: 'Waiting' })),
    ...upcoming,
    ...playing,
  ].filter(({ player }) => {
    if (!outgoing || player.id === outgoing.id || !player.active) return false;
    const sameTeam = [match.sideA, match.sideB].some(
      (side) => side.some((p) => p.id === outgoing.id) && side.some((p) => p.id === player.id),
    );
    return !sameTeam;
  });
  function swap(player: Player) {
    if (!outgoing) return;
    const result = run((e) => e.swapPlayersReleasingDraft(outgoing.id, player.id));
    if (result) notify(result.message);
    if (result?.ok) onDone();
  }
  return (
    <section
      className="ez-swap"
      aria-label={`Swap players on Court ${engine.getCourtNumber(match)}`}
    >
      <h4 ref={heading} tabIndex={-1}>
        {outgoing ? `2. Who replaces ${outgoing.name}?` : '1. Who do you want to swap out?'}
      </h4>
      <p className="ez-hint">Swaps are available at any time during a game.</p>
      {!outgoing ? (
        <div className="ez-swap-options">
          {players.map((p, i) => (
            <button
              className="ez-btn ez-swap-option"
              key={p.id}
              aria-label={`Swap out ${p.name}`}
              onClick={() => setOutgoingId(p.id)}
            >
              <strong>{p.name}</strong>
              <span className="ez-hint">Team {i < match.sideA.length ? 'A' : 'B'}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {waiting.length ? (
            <button className="ez-btn primary block" onClick={() => swap(waiting[0])}>
              Choose next waiting player · {waiting[0].name}
            </button>
          ) : null}
          {options.length > 6 ? (
            <div className="ez-swap-search">
              <label htmlFor={searchId}>Find a replacement</label>
              <input
                id={searchId}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
              />
            </div>
          ) : null}
          {upcoming.length ? (
            <p className="ez-hint">
              Choosing an upcoming player releases their planned game
              {store.gameDay.autoPrepare ? ' so KirQ can prepare it again' : ''}.
            </p>
          ) : null}
          <div className="ez-swap-options">
            {options
              .filter(({ player }) =>
                player.name.toLowerCase().includes(search.trim().toLowerCase()),
              )
              .map(({ player, label }) => (
                <button
                  key={player.id}
                  className="ez-btn ez-swap-option"
                  aria-label={`Swap in ${player.name}`}
                  onClick={() => swap(player)}
                >
                  <strong>{player.name}</strong>
                  <span className="ez-hint">{label}</span>
                </button>
              ))}
          </div>
          {!options.length ? (
            <p className="ez-hint">
              No waiting players. You can swap with the other team, or add someone in Players.
            </p>
          ) : null}
          {options.length &&
          !options.some(({ player }) =>
            player.name.toLowerCase().includes(search.trim().toLowerCase()),
          ) ? (
            <p className="ez-hint">No players match that name.</p>
          ) : null}
          <details className="ez-injury-options">
            <summary>Player needs a break or got hurt?</summary>
            <p className="ez-hint">
              KirQ chooses an available waiting replacement and puts {outgoing.name} on a break.
            </p>
            <button
              className="ez-btn block"
              disabled={!engine.getReplacementCandidates(outgoing.id).length}
              onClick={() => {
                const result = run((e) => e.substituteInjuredPlayer(match.id, outgoing.id));
                if (result)
                  notify(
                    result.ok
                      ? `${result.message} ${outgoing.name} is on a break.`
                      : result.message,
                  );
                if (result?.ok) onDone();
              }}
            >
              Replace and give {outgoing.name} a break
            </button>
            {!engine.getReplacementCandidates(outgoing.id).length ? (
              <p className="ez-hint">
                No unreserved waiting player is available. Use a normal swap above, then mark the
                outgoing player on a break in Players.
              </p>
            ) : null}
          </details>
          <button
            className="ez-link"
            onClick={() => {
              setOutgoingId(null);
              setSearch('');
            }}
          >
            Choose a different player
          </button>
        </>
      )}
      <button className="ez-btn block" onClick={onDone}>
        Cancel swap
      </button>
    </section>
  );
}
