import { useState, useRef } from 'react';
import type { Skill } from '../../domain/types';
import { SKILL_LABELS } from '../../domain/engine';
import { Panel, Status, Empty, useApplication } from '../common';
export function RosterPanel() {
  const { data, run, notify } = useApplication();
  const [name, setName] = useState(''),
    [skill, setSkill] = useState<Skill>('intermediate'),
    [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const active = data.players.filter((p) => p.active).length,
    paused = data.players.length - active;
  return (
    <aside className="sidebar" aria-label="Player management">
      <Panel id="registration-title" eyebrow="01 / Roster Intake" title="Add Player">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const result = run((engine) => engine.addPlayer(name, skill));
            if (!result) return;
            setMessage(result.message);
            if (result.ok) {
              setName('');
              setSkill('intermediate');
              input.current?.focus();
            }
          }}
        >
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="player-name">Player Name</label>
              <input
                ref={input}
                id="player-name"
                type="text"
                name="playerName"
                maxLength={40}
                placeholder="Enter a player name"
                autoComplete="off"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="player-skill">Skill Level</label>
              <select
                id="player-skill"
                value={skill}
                onChange={(e) => setSkill(e.target.value as Skill)}
              >
                {Object.entries(SKILL_LABELS).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <button className="button button-primary" type="submit">
                Add to Roster
              </button>
            </div>
          </div>
        </form>
        <Status message={message} />
      </Panel>
      <Panel
        id="roster-title"
        eyebrow="02 / Active Roster"
        title="Player Roster"
        note={
          paused
            ? `${active} active • ${paused} timed out`
            : `${active} player${active === 1 ? '' : 's'}`
        }
      >
        <ul className="roster-list">
          {data.players.length ? (
            [...data.players]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <li key={p.id} className={`roster-player${!p.active ? ' is-paused' : ''}`}>
                  <div className="player-topline">
                    <div>
                      <h3 className="player-name">{p.name}</h3>
                      <span className="skill-badge">{SKILL_LABELS[p.skill]}</span>
                      {!p.active ? <span className="player-availability">Timed Out</span> : null}
                    </div>
                  </div>
                  <div className="player-stats">
                    {[
                      [p.wins, 'Wins'],
                      [p.losses, 'Losses'],
                      [p.roundsWaited, 'Rounds Waited'],
                    ].map(([value, label]) => (
                      <div className="stat-box" key={label}>
                        <strong>{value}</strong>
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="record-controls">
                    <button
                      className="mini-button availability"
                      onClick={() => {
                        const result = run((e) => e.setPlayerActive(p.id, !p.active));
                        if (result) notify(result.message);
                      }}
                    >
                      {p.active ? 'Time Out Player' : 'Activate Player'}
                    </button>
                    {(['wins', 'losses'] as const).flatMap((stat) =>
                      [1, -1].map((amount) => (
                        <button
                          key={`${stat}${amount}`}
                          className="mini-button"
                          onClick={() => run((e) => e.updatePlayerRecord(p.id, stat, amount))}
                        >
                          {stat === 'wins' ? 'Win' : 'Loss'} {amount === 1 ? '+1' : '−1'}
                        </button>
                      )),
                    )}
                    <button
                      className="mini-button remove"
                      onClick={() => {
                        run((e) => e.removePlayer(p.id));
                        notify(`${p.name} was removed.`);
                      }}
                    >
                      Remove Player
                    </button>
                  </div>
                </li>
              ))
          ) : (
            <li>
              <Empty>No players added yet.</Empty>
            </li>
          )}
        </ul>
      </Panel>
    </aside>
  );
}
