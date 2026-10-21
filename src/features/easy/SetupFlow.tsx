import { useState } from 'react';
import type { Skill } from '../../domain/types';
import { SKILL_LABELS } from '../../domain/engine';
import { useApplication } from '../common';
import { useRoundControls } from '../play/RoundControls';
import { Icon, plural } from './ui';
import { AddPlayerForm, useRemovePlayer } from './players';

// PROTOTYPE (easy mode) — Option A: guided setup for people who have never
// run a queue. Step 1: who's here. Step 2: courts. Then play (Option C).

export const SAMPLE_PLAYERS = [
  'Ria',
  'Marco',
  'Joy',
  'Dante',
  'Bea',
  'Nico',
  'Mika',
  'Paolo',
  'Carla',
  'Ethan',
];

function Steps({ step }: { step: 0 | 1 }) {
  return (
    <>
      <div className="ez-steps" aria-hidden="true">
        {[0, 1, 2].map((n) => (
          <span key={n} className={n <= step ? 'on' : ''} />
        ))}
      </div>
      <p className="ez-step-label">Step {step + 1} of 3</p>
    </>
  );
}

function SkillPicker({ id, skill }: { id: string; skill: Skill }) {
  const { run } = useApplication();
  return (
    <div className="ez-segment" role="group" aria-label="Skill level">
      {(Object.keys(SKILL_LABELS) as Skill[]).map((s) => (
        <button
          key={s}
          aria-pressed={skill === s}
          onClick={() => run((e) => e.setPlayerSkill(id, s))}
        >
          {SKILL_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

function WhoIsHere({ onNext }: { onNext: () => void }) {
  const { data, store, run, notify } = useApplication();
  const remove = useRemovePlayer();
  const [showSkills, setShowSkills] = useState(false);
  const count = data.players.length;
  const need = Math.max(0, 2 - count);
  return (
    <>
      <Steps step={0} />
      <div className="ez-pad">
        <h2>Who's here today?</h2>
        <ol className="ez-how" aria-label="How it works">
          <li>
            <b>1</b>
            <span>Add everyone who came to play.</span>
          </li>
          <li>
            <b>2</b>
            <span>Say how many courts you have.</span>
          </li>
          <li>
            <b>3</b>
            <span>KirQ makes fair teams. You just tap who won.</span>
          </li>
        </ol>
        <AddPlayerForm id="setup-name" />
        {count ? (
          <>
            <ul className="ez-chips" aria-label="Players added">
              {data.players.map((p) => (
                <li className="ez-chip" key={p.id}>
                  {p.name}
                  <button aria-label={`Remove ${p.name}`} onClick={() => remove(p.id)}>
                    <Icon name="x" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              className="ez-link"
              aria-expanded={showSkills}
              onClick={() => setShowSkills(!showSkills)}
            >
              {showSkills ? 'Hide skill levels' : 'Set skill levels (optional, makes teams fairer)'}
            </button>
            {showSkills ? (
              <div className="ez-skill-list">
                {data.players.map((p) => (
                  <div className="ez-skill-row" key={p.id}>
                    <span className="ez-who">{p.name}</span>
                    <SkillPicker id={p.id} skill={p.skill} />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <button
            className="ez-link"
            onClick={() => {
              // A separate practice session keeps the real one clean.
              store.createSession('Practice (sample players)');
              SAMPLE_PLAYERS.forEach((name) => run((e) => e.addPlayer(name, 'intermediate')));
              notify('Practice session with 10 sample players. Your real session is untouched.');
            }}
          >
            Just looking? Try it with 10 sample players
          </button>
        )}
      </div>
      <div className="ez-footer">
        <p className="ez-why">
          {!count
            ? 'Add the people who came. Late arrivals can join any time.'
            : need
              ? `${plural(count, 'player', 'players')} added. Add ${need} more to continue.`
              : `${plural(count, 'player', 'players')} added. Late arrivals can join any time.`}
        </p>
        <button className="ez-btn primary block" disabled={need > 0} onClick={onNext}>
          Next: courts
        </button>
      </div>
    </>
  );
}

export function CourtSettings() {
  const { data } = useApplication();
  const { type, setType, courts, setCourts, limit, setLimit, lateArrivals, setLateArrivals } =
    useRoundControls();
  const [more, setMore] = useState(false);
  const here = data.players.filter((p) => p.active).length;
  const per = type === 'doubles' ? 4 : 2;
  const usable = Math.min(courts, Math.floor(here / per));
  const playing = usable * per;
  return (
    <div className="ez-stack">
      <div className="ez-card">
        <strong id="courts-label">How many courts do you have?</strong>
        <div className="ez-stepper" role="group" aria-labelledby="courts-label">
          <button aria-label="One fewer court" onClick={() => setCourts(courts - 1)}>
            −
          </button>
          <output aria-live="polite">{courts}</output>
          <button aria-label="One more court" onClick={() => setCourts(courts + 1)}>
            +
          </button>
        </div>
      </div>
      <div className="ez-choice" role="group" aria-label="Game type">
        <button aria-pressed={type === 'doubles'} onClick={() => setType('doubles')}>
          <strong>Doubles</strong>
          <span>2 vs 2, 4 people per court</span>
        </button>
        <button aria-pressed={type === 'singles'} onClick={() => setType('singles')}>
          <strong>Singles</strong>
          <span>1 vs 1, 2 people per court</span>
        </button>
      </div>
      <div className="ez-card" role="status">
        {here < per ? (
          `You need at least ${per} people here for ${type}. You have ${here}.`
        ) : (
          <>
            <strong>Each round:</strong> {playing} people play on{' '}
            {plural(usable, 'court', 'courts')}
            {usable < courts ? ` (only enough people for ${usable})` : ''}.{' '}
            {here - playing === 0
              ? 'Nobody sits out.'
              : `${here - playing} ${here - playing === 1 ? 'person sits' : 'people sit'} out and ${
                  here - playing === 1 ? 'goes' : 'go'
                } first next time.`}
          </>
        )}
      </div>
      <button className="ez-link" aria-expanded={more} onClick={() => setMore(!more)}>
        {more ? 'Hide more options' : 'More options'}
      </button>
      {more ? (
        <>
          <fieldset className="ez-card ez-fieldset">
            <legend>
              <strong>When someone arrives late</strong>
            </legend>
            <div className="ez-radio-list">
              <label className="ez-radio">
                <input
                  type="radio"
                  name="late-arrivals"
                  checked={lateArrivals === 'back'}
                  onChange={() => setLateArrivals('back')}
                />
                <span>
                  <strong>They join the back of the line</strong>
                  <span className="ez-hint">
                    Fair for open play: no one skips ahead of people already waiting.
                  </span>
                </span>
              </label>
              <label className="ez-radio">
                <input
                  type="radio"
                  name="late-arrivals"
                  checked={lateArrivals === 'next'}
                  onChange={() => setLateArrivals('next')}
                />
                <span>
                  <strong>They play in the next round</strong>
                  <span className="ez-hint">
                    Nice for family and friends, so latecomers get a game right away.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
          {type === 'doubles' ? (
            <div className="ez-card">
              <label htmlFor="partner-limit">
                <strong>Mix up partners</strong>
              </label>
              <p className="ez-hint">How many times the same two people can be partners.</p>
              <select
                id="partner-limit"
                className="ez-select"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value="1">Only once</option>
                <option value="2">At most twice (recommended)</option>
                <option value="3">At most three times</option>
                <option value="unlimited">No limit</option>
              </select>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function SetupFlow({
  step,
  setStep,
  editing,
  onDone,
}: {
  step: 0 | 1;
  setStep: (step: 0 | 1) => void;
  editing: boolean;
  onDone: () => void;
}) {
  const { generate } = useRoundControls();
  if (step === 0) return <WhoIsHere onNext={() => setStep(1)} />;
  return (
    <>
      {!editing ? <Steps step={1} /> : null}
      <div className="ez-pad">
        <button className="ez-back" onClick={() => (editing ? onDone() : setStep(0))}>
          <Icon name="back" />
          {editing ? 'Back to courts' : 'Back'}
        </button>
        <h2>{editing ? 'Courts and game type' : 'Set up the courts'}</h2>
        <p className="ez-lead">
          {editing ? 'Changes apply from the next round.' : 'You can change this later.'}
        </p>
        <CourtSettings />
      </div>
      <div className="ez-footer">
        {editing ? (
          <button className="ez-btn primary block" onClick={onDone}>
            Done
          </button>
        ) : (
          <button
            className="ez-btn primary block"
            onClick={() => {
              if (generate() === 'started') onDone();
            }}
          >
            Start playing
          </button>
        )}
      </div>
    </>
  );
}
