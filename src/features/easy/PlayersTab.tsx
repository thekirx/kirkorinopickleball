import { winStreak } from '../../domain/strength';
import { useState } from 'react';
import type { Skill } from '../../domain/types';
import { SKILL_LABELS } from '../../domain/engine';
import { useApplication } from '../common';
import { useRoundControls } from '../play/RoundControls';
import { AddPlayerForm, playerStatus, useRemovePlayer } from './players';
import { Icon } from './ui';
import { NextPlayers } from './NextPlayers';

// PROTOTYPE (easy mode) — Option C, Players tab. Late arrivals are added here
// any time; breaks are one tap; rarer controls sit behind "More".

export function PlayersTab() {
  const { data, store, run, notify } = useApplication();
  const { lateArrivals } = useRoundControls();
  const remove = useRemovePlayer();
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const players = data.players
    .filter((p) => p.name.toLocaleLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="ez-pad">
      <h2>Who's here?</h2>
      <p className="ez-lead">
        Someone arrived? Add them here.{' '}
        {lateArrivals === 'next'
          ? 'Late arrivals get the next available game.'
          : 'Late arrivals join the back of the line.'}{' '}
        <b>Break</b> skips someone until they tap <b>I'm back</b>.
      </p>
      <AddPlayerForm id="players-name" compact />
      <NextPlayers />
      <div className="ez-search">
        <label htmlFor="player-search">Search players</label>
        <div className="ez-search-row">
          <input
            id="player-search"
            type="search"
            value={search}
            placeholder="Find a name"
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button className="ez-pill" onClick={() => setSearch('')}>
              Clear search
            </button>
          ) : null}
        </div>
        <p className="ez-hint" role="status">
          {players.length} of {data.players.length} players
        </p>
      </div>
      {players.length ? (
        <ul className="ez-list ez-player-grid" aria-label="Players">
          {players.map((p) => {
            const status = playerStatus(data, p.id);
            const where =
              status.kind === 'court'
                ? `Playing on Court ${status.court}`
                : status.kind === 'queued'
                  ? `Upcoming game ${status.game}`
                  : status.kind === 'break'
                    ? 'On a break'
                    : status.kind === 'sitting'
                      ? 'Waiting to play'
                      : 'Ready';
            const expanded = open === p.id;
            return (
              <li key={p.id} className={`ez-player${status.kind === 'break' ? ' resting' : ''}`}>
                <div className="ez-player-main">
                  <div className="ez-player-text">
                    <span className="ez-who">{p.name}</span>
                    <span className="ez-hint">
                      {where} · {SKILL_LABELS[p.skill]} · {p.wins} won, {p.losses} lost
                      {winStreak(p, data.matchLog) > 1
                        ? ` · ${winStreak(p, data.matchLog)}-win streak`
                        : ''}
                    </span>
                  </div>
                  <button
                    className="ez-pill ez-play-next"
                    aria-label={`Play next: ${p.name}`}
                    disabled={
                      !p.active ||
                      status.kind === 'court' ||
                      status.kind === 'queued' ||
                      store.gameDay.nextPlayerIds.includes(p.id)
                    }
                    onClick={() => notify(store.queuePlayer(p.id).message)}
                  >
                    {store.gameDay.nextPlayerIds.includes(p.id) ? 'Queued' : 'Play next'}
                  </button>
                  <button
                    className="ez-pill"
                    aria-pressed={!p.active}
                    aria-label={p.active ? `${p.name} is taking a break` : `${p.name} is back`}
                    onClick={() => {
                      const result = run((e) => e.setPlayerActive(p.id, !p.active));
                      if (!result) return;
                      notify(
                        p.active
                          ? status.kind === 'court'
                            ? `${p.name} will sit out after this game.`
                            : `${p.name} is on a break.`
                          : `${p.name} is back in the queue.`,
                      );
                    }}
                  >
                    {p.active ? 'Break' : "I'm back"}
                  </button>
                  <button
                    className="ez-pill"
                    aria-expanded={expanded}
                    aria-label={`More for ${p.name}`}
                    onClick={() => setOpen(expanded ? null : p.id)}
                  >
                    More <Icon name="chevron" />
                  </button>
                </div>
                {expanded ? (
                  <div className="ez-player-more">
                    <p className="ez-hint">Skill level (helps make fair teams)</p>
                    <div
                      className="ez-segment"
                      role="group"
                      aria-label={`Skill level for ${p.name}`}
                    >
                      {(Object.keys(SKILL_LABELS) as Skill[]).map((s) => (
                        <button
                          key={s}
                          aria-pressed={p.skill === s}
                          onClick={() => run((e) => e.setPlayerSkill(p.id, s))}
                        >
                          {SKILL_LABELS[s]}
                        </button>
                      ))}
                    </div>
                    <p className="ez-hint">Fix their record</p>
                    <div className="ez-fix">
                      {(['wins', 'losses'] as const).map((stat) => (
                        <div className="ez-fix-row" key={stat}>
                          <span>
                            {stat === 'wins' ? 'Won' : 'Lost'}: <b>{p[stat]}</b>
                          </span>
                          <button
                            className="ez-pill"
                            aria-label={`${stat === 'wins' ? 'One fewer win' : 'One fewer loss'} for ${p.name}`}
                            onClick={() => run((e) => e.updatePlayerRecord(p.id, stat, -1))}
                          >
                            −1
                          </button>
                          <button
                            className="ez-pill"
                            aria-label={`${stat === 'wins' ? 'One more win' : 'One more loss'} for ${p.name}`}
                            onClick={() => run((e) => e.updatePlayerRecord(p.id, stat, 1))}
                          >
                            +1
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      className="ez-btn danger block"
                      disabled={status.kind === 'court'}
                      onClick={() => {
                        remove(p.id);
                        setOpen(null);
                      }}
                    >
                      {status.kind === 'court' ? `Playing now, can't remove` : `Remove ${p.name}`}
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ez-hint">
          {query
            ? `No players match “${search.trim()}”.`
            : 'No one yet. Add the people who are here.'}
        </p>
      )}
    </div>
  );
}
