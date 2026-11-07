import { useState } from 'react';
import type { Skill, SessionState } from '../../domain/types';
import { useApplication } from '../common';
import { useRoundControls } from '../play/RoundControls';
import { Icon } from './ui';
import { createEngine, SKILL_LABELS } from '../../domain/engine';

// PROTOTYPE (easy mode): player helpers shared by setup and the Players tab.

export type PlayerStatus =
  | { kind: 'court'; court: number }
  | { kind: 'queued'; game: number }
  | { kind: 'sitting' }
  | { kind: 'break' }
  | { kind: 'idle' };

export function playerStatus(data: SessionState, id: string): PlayerStatus {
  const player = data.players.find((p) => p.id === id);
  const index = data.activeMatches.findIndex(
    (m) => m.status !== 'finished' && [...m.sideA, ...m.sideB].some((p) => p.id === id),
  );
  if (index >= 0)
    return { kind: 'court', court: createEngine(data).getCourtNumber(data.activeMatches[index]) };
  if (player && !player.active) return { kind: 'break' };
  const draft = data.queuedGames.findIndex((game) => [...game.sideA, ...game.sideB].includes(id));
  if (draft >= 0) return { kind: 'queued', game: draft + 1 };
  return data.currentRound > 0 ? { kind: 'sitting' } : { kind: 'idle' };
}

export function AddPlayerForm({ id, compact = false }: { id: string; compact?: boolean }) {
  const { run, notify } = useApplication();
  const { placeNewPlayer } = useRoundControls();
  const [name, setName] = useState('');
  const [skill, setSkill] = useState<Skill | ''>('');
  return (
    <form
      className="ez-add ez-add-player"
      aria-label="Add a player"
      onSubmit={(e) => {
        e.preventDefault();
        if (!skill) return;
        const clean = name.trim().replace(/\s+/g, ' ');
        let addedId = '';
        const result = run((engine) => {
          const outcome = engine.addPlayer(name, skill);
          if (outcome.ok)
            addedId = engine.getRankedPlayers().find((p) => p.name === clean)?.id ?? '';
          return outcome;
        });
        if (!result) return;
        if (result.ok) {
          setName('');
          setSkill('');
          const rule = addedId ? placeNewPlayer(addedId) : '';
          notify(`${clean} added.${rule ? ` ${rule}` : ''}`);
        } else notify(result.message);
        document.getElementById(id)?.focus();
      }}
    >
      <label className="ez-sr" htmlFor={id}>
        Player name
      </label>
      <input
        id={id}
        value={name}
        maxLength={40}
        autoComplete="off"
        placeholder={compact ? 'Add someone who arrived' : 'Type a name, e.g. Ria'}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="ez-add-skill-row">
        <label htmlFor={`${id}-skill`}>Skill level for new player</label>
        <select
          id={`${id}-skill`}
          className="ez-select"
          required
          value={skill}
          onChange={(event) => setSkill(event.target.value as Skill | '')}
        >
          <option value="" disabled>
            Choose skill
          </option>
          {(Object.keys(SKILL_LABELS) as Skill[]).map((level) => (
            <option key={level} value={level}>
              {SKILL_LABELS[level]}
            </option>
          ))}
        </select>
      </div>
      <button className="ez-btn primary" type="submit" disabled={!skill || !name.trim()}>
        <Icon name="plus" />
        <span>Add</span>
      </button>
    </form>
  );
}

/** Remove with Undo. Someone on a court can't be removed: that would delete the whole court. */
export function useRemovePlayer() {
  const { data, store, run, notify } = useApplication();
  return (id: string) => {
    const player = data.players.find((p) => p.id === id);
    if (!player) return;
    const status = playerStatus(data, id);
    if (status.kind === 'court') {
      notify(`${player.name} is playing on Court ${status.court}. Swap them out first.`);
      return;
    }
    const snapshot = data;
    run((e) => e.removePlayer(id));
    notify(`${player.name} removed.`, () => store.restoreSession(snapshot));
  };
}
