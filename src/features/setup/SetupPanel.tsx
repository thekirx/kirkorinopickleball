import { useState } from 'react';
import type { MatchType } from '../../domain/types';
import { Panel, useApplication } from '../common';
export function SetupPanel() {
  const { run, notify } = useApplication();
  const [type, setType] = useState<MatchType>('doubles'),
    [courts, setCourts] = useState('2'),
    [limit, setLimit] = useState('2');
  return (
    <Panel
      id="configuration-title"
      eyebrow="04 / Setup"
      title="Session Config"
      className="config-panel"
      note="The highest-priority waiting players are selected before teams are randomized."
    >
      <div className="form-grid">
        <fieldset className="form-group full-width" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Match Type</legend>
          <div className="radio-group">
            {(['singles', 'doubles'] as const).map((value) => (
              <label className="radio-option" key={value}>
                <input
                  type="radio"
                  name="match-type"
                  checked={type === value}
                  value={value}
                  onChange={() => setType(value)}
                />
                {value === 'singles' ? 'Singles (2 per court)' : 'Doubles (4 per court)'}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-group">
          <label htmlFor="court-count">Number of Available Courts</label>
          <input
            id="court-count"
            type="number"
            min="1"
            max="20"
            inputMode="numeric"
            value={courts}
            onChange={(e) => setCourts(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="teammate-limit">Same Teammate Limit</label>
          <select
            id="teammate-limit"
            disabled={type === 'singles'}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          >
            <option value="unlimited">No limit</option>
            <option value="1">Maximum once</option>
            <option value="2">Maximum twice</option>
            <option value="3">Maximum thrice</option>
          </select>
        </div>
        <div className="form-group full-width">
          <button
            className="button button-primary generate-button"
            onClick={() => {
              const count = Math.max(1, Math.min(20, Number(courts) || 1));
              setCourts(String(count));
              const result = run((e) => {
                const plan = e.createRoundPlan({
                  matchType: type,
                  courtCount: count,
                  teammateLimit: limit === 'unlimited' ? Infinity : Number(limit),
                });
                if (plan.ok) e.applyRoundPlan(plan, type);
                return plan;
              });
              if (result)
                notify(
                  result.ok
                    ? result.reducedCourts
                      ? `Round generated with ${result.courtCount} court(s), because the active roster can only fill that many of the ${result.requestedCourtCount} requested court(s).`
                      : 'Round generated. Selected players were reset to 0 rounds waited; benched players gained 1 round waited.'
                    : result.message,
                );
            }}
          >
            Generate Next Round
          </button>
        </div>
      </div>
    </Panel>
  );
}
