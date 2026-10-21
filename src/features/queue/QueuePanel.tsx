import { createEngine, SKILL_LABELS } from '../../domain/engine';
import { Panel, Empty, useApplication } from '../common';
export function QueuePanel() {
  const { data } = useApplication(),
    assigned = createEngine(data).getAssignedPlayerIds(),
    waiting = data.players
      .filter((p) => p.active && !assigned.has(p.id))
      .sort((a, b) => b.roundsWaited - a.roundsWaited || a.name.localeCompare(b.name));
  return (
    <Panel
      id="queue-title"
      eyebrow="06 / Waiting"
      title="Next Up"
      note="Ordered by rounds waited, with ties randomized on each round."
    >
      <ol className="queue-list">
        {waiting.length ? (
          waiting.map((p, i) => (
            <li className="queue-item" key={p.id}>
              <span className="queue-position">{i + 1}</span>
              <div className="queue-player-info">
                <strong>{p.name}</strong>
                <span>
                  {SKILL_LABELS[p.skill]} • {p.wins}W / {p.losses}L
                </span>
              </div>
              <span className="queue-wait">
                {p.roundsWaited} round{p.roundsWaited === 1 ? '' : 's'} waited
              </span>
            </li>
          ))
        ) : (
          <li>
            <Empty>
              {data.activeMatches.length
                ? 'No active players are waiting. Everyone available is assigned to a court.'
                : 'The active-player queue will appear after a round is generated.'}
            </Empty>
          </li>
        )}
      </ol>
    </Panel>
  );
}
