import { useApplication } from '../common';
export function DraftGames() {
  const { data, store, viewer, run, notify } = useApplication();
  const capacity = 3 - data.queuedGames.length;
  const automatic = store.gameDay.autoPrepare;
  const count = automatic
    ? store.gameDay.draftCount
    : Math.min(store.gameDay.draftCount, Math.max(1, capacity));
  const name = (id: string) => data.players.find((p) => p.id === id)?.name ?? 'Unavailable player';
  return (
    <section className="ez-pad ez-draft-section" aria-label="Next in queue">
      <h2>Next in queue</h2>
      <p className="ez-hint">
        {automatic && !viewer
          ? 'KirQ prepares the next teams for you. Start them when a court is ready.'
          : 'These teams play on the next available court.'}
      </p>
      {!viewer ? (
        <div className="ez-draft-controls">
          <label className="ez-auto-prepare">
            <input
              type="checkbox"
              checked={automatic}
              onChange={(event) => store.setGameDaySettings({ autoPrepare: event.target.checked })}
            />
            <span>Prepare upcoming games automatically</span>
          </label>
          <label htmlFor="draft-count">
            {automatic ? 'Games to keep ready' : 'Games to draft'}
          </label>
          <select
            id="draft-count"
            className="ez-select"
            value={count}
            disabled={!automatic && !capacity}
            onChange={(event) =>
              store.setGameDaySettings({ draftCount: Number(event.target.value) })
            }
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n} disabled={!automatic && n > capacity}>
                {n}
              </option>
            ))}
          </select>
          {!automatic ? (
            <button
              className="ez-btn primary"
              disabled={!automatic && !capacity}
              onClick={() => {
                const result = run((e) =>
                  e.draftNextGames(count, {
                    matchType: store.gameDay.type,
                    courtCount: store.gameDay.courts,
                    teammateLimit:
                      store.gameDay.limit === 'unlimited' ? Infinity : Number(store.gameDay.limit),
                    priorityPlayerIds: store.gameDay.nextPlayerIds,
                  }),
                );
                if (result) notify(result.message);
              }}
            >
              Draft next games
            </button>
          ) : null}
          {data.queuedGames.length ? (
            <button
              className="ez-btn"
              onClick={() => {
                store.clearUpcomingGames();
                notify(
                  'Upcoming games cleared. Automatic preparation is off. Players return to the waiting queue.',
                );
              }}
            >
              Clear upcoming games
            </button>
          ) : null}
        </div>
      ) : null}
      {!viewer && automatic && store.preparationNotice ? (
        <p className="ez-hint" role="status">
          {store.preparationNotice}
        </p>
      ) : null}
      {!viewer && store.queueNotice ? (
        <p className="ez-warn" role="status">
          {store.queueNotice}
        </p>
      ) : null}
      <div className="ez-draft-grid">
        {data.queuedGames.map((game, index) => (
          <article key={game.id} className="ez-card" aria-label={`Upcoming game ${index + 1}`}>
            <div className="ez-court-head">
              <h3>{index === 0 ? 'Up next' : `Then ${index + 1}`}</h3>
              <span className="ez-tag">{game.matchType === 'doubles' ? 'Doubles' : 'Singles'}</span>
            </div>
            <p className="ez-names">{game.sideA.map(name).join(' & ')}</p>
            <div className="ez-vs">vs</div>
            <p className="ez-names">{game.sideB.map(name).join(' & ')}</p>
          </article>
        ))}
      </div>
      {!data.queuedGames.length && !(automatic && !viewer && store.preparationNotice) ? (
        <p className="ez-hint">
          {viewer
            ? 'No upcoming games yet.'
            : automatic
              ? 'Waiting for enough available players to prepare the next teams.'
              : 'Turn on automatic preparation, or draft the next games yourself.'}
        </p>
      ) : null}
    </section>
  );
}
