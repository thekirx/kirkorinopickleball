import { useApplication } from '../common';

export function NextPlayers() {
  const { data, store, viewer, notify } = useApplication();
  if (viewer || !store.gameDay.nextPlayerIds.length) return null;
  return (
    <section className="ez-card ez-next-picks" aria-label="Organizer queue selections">
      <h3 className="ez-card-title">Play next</h3>
      <p className="ez-hint">
        Your picks go first, in this order. Each available court takes the next picks; the rest keep
        their spots.
      </p>
      <ol className="ez-next" aria-label="Play next selections">
        {store.gameDay.nextPlayerIds.map((id, index) => {
          const player = data.players.find((p) => p.id === id);
          if (!player) return null;
          return (
            <li key={id}>
              <span className="ez-n">{index + 1}</span>
              <span className="ez-who">{player.name}</span>
              <button
                className="ez-pill"
                aria-label={`Cancel play next for ${player.name}`}
                onClick={() => {
                  store.cancelQueuedPlayer(id);
                  notify(`${player.name} returns to the normal rotation.`);
                }}
              >
                Cancel
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
