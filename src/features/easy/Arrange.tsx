import { useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { ActiveMatch, Player } from '../../domain/types';
import { createEngine } from '../../domain/engine';
import { useApplication } from '../common';

// PROTOTYPE (easy mode): "Move players". Drag a name onto another name to swap
// them — across courts, across the net, or with someone sitting out. Every
// drag has a tap alternative (tap one name, then another; WCAG 2.2 2.5.7), and
// that tap path is also the keyboard path, since each name is a real button.
// Tap-to-win is switched off here so a drag can never record a result.

const playerKey = (id: string) => `p:${id}`;

function Chip({
  player,
  locked,
  selected,
  dragging,
  activeId,
  onTap,
}: {
  player: Player;
  locked: string | null;
  selected: boolean;
  dragging: boolean;
  activeId: string | null;
  onTap: (id: string) => void;
}) {
  const { data } = useApplication();
  const drag = useDraggable({ id: playerKey(player.id), disabled: Boolean(locked) });
  const drop = useDroppable({ id: playerKey(player.id) });
  // While something is being dragged, show whether dropping here would work.
  const reason =
    activeId && activeId !== player.id
      ? createEngine(data).swapBlockReason(activeId, player.id)
      : null;
  const state = !activeId || activeId === player.id ? '' : reason ? ' is-bad' : ' is-ok';
  return (
    <button
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      type="button"
      className={`ez-chip-drag${selected ? ' is-selected' : ''}${dragging ? ' is-lifted' : ''}${
        drop.isOver ? ' is-over' : ''
      }${state}`}
      aria-pressed={selected}
      aria-disabled={Boolean(locked)}
      title={locked ?? (drop.isOver && reason ? reason : undefined)}
      {...drag.listeners}
      onClick={() => onTap(player.id)}
    >
      {player.name}
    </button>
  );
}

function CourtBox({
  match,
  index,
  ...chip
}: {
  match: ActiveMatch;
  index: number;
  selectedId: string | null;
  activeId: string | null;
  onTap: (id: string) => void;
}) {
  const { data } = useApplication();
  const engine = createEngine(data);
  const locked =
    match.status === 'finished'
      ? 'Finished'
      : !engine.canChangeMatchPlayer(match)
        ? 'Started over 2 minutes ago'
        : null;
  const team = (players: Player[]) => (
    <div className="ez-drop-team">
      {players.map((p) => (
        <Chip
          key={p.id}
          player={p}
          locked={locked}
          selected={chip.selectedId === p.id}
          dragging={chip.activeId === p.id}
          activeId={chip.activeId}
          onTap={chip.onTap}
        />
      ))}
    </div>
  );
  return (
    <article className={`ez-card${locked ? ' ez-locked' : ''}`} aria-label={`Court ${index + 1}`}>
      <div className="ez-court-head">
        <h3>Court {index + 1}</h3>
        {locked ? <span className="ez-tag">Locked · {locked}</span> : null}
      </div>
      {team(match.sideA)}
      <div className="ez-vs">vs</div>
      {team(match.sideB)}
    </article>
  );
}

export function ArrangeBoard({ onDone }: { onDone: () => void }) {
  const { data, run, notify } = useApplication();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const justDragged = useRef(false);
  // Mouse: start after a small move. Touch: press and hold briefly, so a
  // finger can still scroll the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );
  const byId = (id: string) => data.players.find((p) => p.id === id);
  const fromKey = (key: string | number) => String(key).replace(/^p:/, '');

  const inRound = new Set(
    data.activeMatches.flatMap((m) => [...m.sideA, ...m.sideB].map((p) => p.id)),
  );
  const sitting = data.players.filter((p) => p.active && !inRound.has(p.id));

  function swap(a: string, b: string) {
    const result = run((e) => e.swapPlayers(a, b));
    if (result) notify(result.message);
    return result?.ok ?? false;
  }

  function onTap(id: string) {
    if (justDragged.current) return;
    if (!selectedId) {
      const onLockedCourt = data.activeMatches.some(
        (m) =>
          [...m.sideA, ...m.sideB].some((p) => p.id === id) &&
          (m.status === 'finished' || !createEngine(data).canChangeMatchPlayer(m)),
      );
      if (onLockedCourt) {
        notify(`${byId(id)?.name}'s court is locked. Pick someone on an open court.`);
        return;
      }
      setSelectedId(id);
      notify(`${byId(id)?.name} picked. Now tap who to swap with.`);
      return;
    }
    if (selectedId === id) {
      setSelectedId(null);
      notify('Cancelled.');
      return;
    }
    swap(selectedId, id);
    setSelectedId(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const from = fromKey(event.active.id);
    setActiveId(null);
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    if (!event.over) return;
    const to = fromKey(event.over.id);
    if (to !== from) swap(from, to);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${byId(fromKey(active.id))?.name}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return 'Not over anyone.';
      if (over.id === active.id)
        return `Holding ${byId(fromKey(active.id))?.name}. Drag onto someone to swap.`;
      const reason = createEngine(data).swapBlockReason(fromKey(active.id), fromKey(over.id));
      return reason
        ? `Over ${byId(fromKey(over.id))?.name}. ${reason}`
        : `Over ${byId(fromKey(over.id))?.name}. Drop to swap.`;
    },
    onDragEnd: ({ over }) => (over ? 'Dropped.' : 'Dropped back where it was.'),
    onDragCancel: () => 'Move cancelled.',
  };

  const lifted = activeId ? byId(activeId) : null;
  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: 'Tap this name, then tap another name to swap them.',
        },
      }}
      onDragStart={({ active }) => {
        setSelectedId(null);
        setActiveId(fromKey(active.id));
      }}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
    >
      <div className="ez-arrange-help" role="note">
        <strong>Move players</strong>
        <span>
          Drag a name onto another name to swap them. Or tap one name, then another. Courts that
          started over 2 minutes ago are locked.
        </span>
      </div>
      <div className="ez-pad ez-courts-body">
        <div className="ez-courts-grid">
          {data.activeMatches.map((m, i) => (
            <CourtBox
              key={m.id}
              match={m}
              index={i}
              selectedId={selectedId}
              activeId={activeId}
              onTap={onTap}
            />
          ))}
        </div>
        <aside className="ez-courts-side">
          <section className="ez-card" aria-labelledby="bench-title">
            <h3 id="bench-title" className="ez-card-title">
              Sitting out
            </h3>
            <p className="ez-hint">Drag one onto a court to bring them in.</p>
            {sitting.length ? (
              <div className="ez-drop-team wrap">
                {sitting.map((p) => (
                  <Chip
                    key={p.id}
                    player={p}
                    locked={null}
                    selected={selectedId === p.id}
                    dragging={activeId === p.id}
                    activeId={activeId}
                    onTap={onTap}
                  />
                ))}
              </div>
            ) : (
              <p className="ez-hint">Nobody is sitting out.</p>
            )}
          </section>
        </aside>
      </div>
      <div className="ez-footer above-tabs">
        <button className="ez-btn primary block" onClick={onDone}>
          Done moving players
        </button>
      </div>
      <DragOverlay>
        {lifted ? <div className="ez-chip-drag is-ghost">{lifted.name}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
