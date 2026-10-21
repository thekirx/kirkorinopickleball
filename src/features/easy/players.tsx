import { useState } from 'react';
import type { TournamentStateV2 } from '../../domain/types';
import { useApplication } from '../common';
import { useRoundControls } from '../play/RoundControls';
import { Icon } from './ui';

// PROTOTYPE (easy mode): player helpers shared by setup and the Players tab.

export type PlayerStatus =
  | { kind: 'court'; court: number }
  | { kind: 'sitting' }
  | { kind: 'break' }
  | { kind: 'idle' };

export function playerStatus(data: TournamentStateV2, id: string): PlayerStatus {
  const player = data.players.find((p) => p.id === id);
  if (player && !player.active) return { kind: 'break' };
  const index = data.activeMatches.findIndex(
    (m) => m.status !== 'finished' && [...m.sideA, ...m.sideB].some((p) => p.id === id),
  );
  if (index >= 0) return { kind: 'court', court: index + 1 };
  const inRound = data.activeMatches.some((m) => [...m.sideA, ...m.sideB].some((p) => p.id === id));
  return data.activeMatches.length && !inRound ? { kind: 'sitting' } : { kind: 'idle' };
}

export function AddPlayerForm({ id, compact = false }: { id: string; compact?: boolean }) {
  const { run, notify } = useApplication();
  const { placeNewPlayer } = useRoundControls();
  const [name, setName] = useState('');
  return (
    <form
      className="ez-add"
      aria-label="Add a player"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = name.trim().replace(/\s+/g, ' ');
        let addedId = '';
        const result = run((engine) => {
          const outcome = engine.addPlayer(name, 'intermediate');
          if (outcome.ok)
            addedId = engine.getRankedPlayers().find((p) => p.name === clean)?.id ?? '';
          return outcome;
        });
        if (!result) return;
        if (result.ok) {
          setName('');
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
      <button className="ez-btn primary" type="submit">
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
