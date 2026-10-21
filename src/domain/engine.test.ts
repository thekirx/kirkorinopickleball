import { describe, it, expect } from 'vitest';
import { createEngine } from './engine';
import { migrate } from './migrate';
function setup() {
  const state = migrate({
    players: ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({
      id,
      name: id,
      skill: i === 5 ? 'beginner' : 'intermediate',
      roundsWaited: i,
    })),
  });
  return { state, app: createEngine(state, () => 0.37) };
}
describe('rotation and substitutions', () => {
  it('excludes timed-out players and freezes their wait; activation restores eligibility', () => {
    const { state, app } = setup();
    app.setPlayerActive('f', false);
    const plan = app.createRoundPlan({
      matchType: 'doubles',
      courtCount: 2,
      teammateLimit: Infinity,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.selectedPlayers.map((p) => p.id).sort()).toEqual(['b', 'c', 'd', 'e']);
    app.applyRoundPlan(plan, 'doubles', 1000);
    expect(state.players[5].roundsWaited).toBe(5);
    app.setPlayerActive('f', true);
    expect(state.players[5].active).toBe(true);
  });
  it('changes one doubles player and corrects teammate history, then locks exactly at two minutes', () => {
    const { state, app } = setup();
    const plan = app.createRoundPlan({
      matchType: 'doubles',
      courtCount: 1,
      teammateLimit: Infinity,
    });
    if (!plan.ok) throw Error();
    app.applyRoundPlan(plan, 'doubles', 1000);
    const m = state.activeMatches[0],
      outgoing = m.sideA[0],
      partner = m.sideA[1];
    const key = [outgoing.id, partner.id].sort().join('|');
    expect(app.replaceMatchPlayer(m.id, outgoing.id, 'a', 120999, 'standard').ok).toBe(true);
    expect(state.teammateHistory.has(key)).toBe(false);
    expect(state.teammateHistory.get(['a', partner.id].sort().join('|'))).toBe(1);
    expect(
      state.teammateHistory.get(
        m.sideB
          .map((p) => p.id)
          .sort()
          .join('|'),
      ),
    ).toBe(1);
    const before = JSON.stringify(m);
    expect(app.replaceMatchPlayer(m.id, 'a', 'b', 121000, 'standard')).toMatchObject({
      ok: false,
      reason: 'change-window-expired',
    });
    expect(JSON.stringify(m)).toBe(before);
  });
  it('allows an injury replacement after expiry and chooses closest skill before wait', () => {
    const { state, app } = setup();
    const p = state.players;
    state.activeMatches = [
      {
        id: 'm',
        sideA: [p[0], p[1]],
        sideB: [p[2], p[3]],
        status: 'active',
        winnerSide: null,
        generatedAt: 1000,
        courtId: 'court-m',
      },
    ];
    const result = app.substituteInjuredPlayer('m', 'a', 500000);
    expect(result.ok).toBe(true);
    expect(p[0].active).toBe(false);
    expect(state.activeMatches[0].sideA[0].id).toBe('e');
    expect(p[4].roundsWaited).toBe(0);
  });
  it('records only the final lineup, and refuses repeated results or finished-match edits', () => {
    const { state, app } = setup();
    const plan = app.createRoundPlan({
      matchType: 'singles',
      courtCount: 1,
      teammateLimit: Infinity,
    });
    if (!plan.ok) throw Error();
    app.applyRoundPlan(plan, 'singles', 1000);
    const m = state.activeMatches[0];
    app.declareWinner(m.id, 'A');
    app.declareWinner(m.id, 'A');
    expect(state.matchLog).toHaveLength(1);
    expect(m.sideA[0].wins).toBe(1);
    expect(m.sideB[0].losses).toBe(1);
    expect(app.replaceMatchPlayer(m.id, m.sideA[0].id, 'a', 1001, 'standard').ok).toBe(false);
  });
  it('enforces teammate limits and never selects anyone twice in randomized rounds', () => {
    const { state, app } = setup();
    for (let i = 0; i < 20; i++) {
      const plan = app.createRoundPlan({
        matchType: 'doubles',
        courtCount: 2,
        teammateLimit: Infinity,
      });
      if (!plan.ok) throw Error();
      expect(new Set(plan.selectedPlayers.map((p) => p.id)).size).toBe(4);
      app.applyRoundPlan(plan, 'doubles');
    }
    state.players = state.players.slice(0, 4);
    for (const a of state.players)
      for (const b of state.players) state.teammateHistory.set([a.id, b.id].sort().join('|'), 1);
    expect(app.createRoundPlan({ matchType: 'doubles', courtCount: 1, teammateLimit: 1 }).ok).toBe(
      false,
    );
  });
});
