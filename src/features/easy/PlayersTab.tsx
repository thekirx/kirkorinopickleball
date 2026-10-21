import { useState } from 'react';
import type { Skill } from '../../domain/types';
import { SKILL_LABELS } from '../../domain/engine';
import { useApplication } from '../common';
import { useRoundControls } from '../play/RoundControls';
import { AddPlayerForm, playerStatus, useRemovePlayer } from './players';
import { Icon } from './ui';

// PROTOTYPE (easy mode) — Option C, Players tab. Late arrivals are added here
// any time; breaks are one tap; rarer controls sit behind "More".

export function PlayersTab() {
  const { data, run, notify } = useApplication();
  const { lateArrivals } = useRoundControls();
  const remove = useRemovePlayer();
  const [open, setOpen] = useState<string | null>(null);
  const players = [...data.players].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="ez-pad">
      <h2>Who's here?</h2>
      <p className="ez-lead">
        Someone arrived? Add them here.{' '}
        {lateArrivals === 'next'
          ? 'Late arrivals play in the next round.'
          : 'Late arrivals join the back of the line.'}{' '}
        <b>Break</b> skips someone until they tap <b>I'm back</b>.
      </p>
      <AddPlayerForm id="players-name" compact />
      {players.length ? (
        <ul className="ez-list ez-player-grid" aria-label="Players">
          {players.map((p) => {
            const status = playerStatus(data, p.id);
            const where =
              status.kind === 'court'
                ? `Playing on Court ${status.court}`
                : status.kind === 'break'
                  ? 'On a break'
                  : status.kind === 'sitting'
                    ? 'Sitting out this round'
                    : 'Ready';
            const expanded = open === p.id;
            return (
              <li key={p.id} className={`ez-player${status.kind === 'break' ? ' resting' : ''}`}>
                <div className="ez-player-main">
                  <div className="ez-player-text">
                    <span className="ez-who">{p.name}</span>
                    <span className="ez-hint">
                      {where} · {p.wins} won, {p.losses} lost
                    </span>
                  </div>
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
                          : `${p.name} is back and joins the next round.`,
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
        <p className="ez-hint">No one yet. Add the people who are here.</p>
      )}
    </div>
  );
}
