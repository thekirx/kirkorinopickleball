import { describe, expect, it } from 'vitest';
import { migrate } from './migrate';
import { serializeState } from './serialize';
import captured from '../test/fixtures/v1-session.json';
const legacy = {
  players: [
    { id: 'a', name: 'Alice', skill: 'pro', active: false, wins: 3 },
    { id: 'b', name: 'Bea' },
  ],
  currentRound: 2,
  activeMatches: [
    { id: 'm', sideA: ['a'], sideB: ['b'], generatedAt: 1000 },
    { id: 'bad', sideA: ['missing'], sideB: ['b'] },
  ],
  matchLog: [],
  teammateHistory: [['a|b', 2]],
};
describe('v1 migration', () => {
  it('migrates a real browser-captured v1 session with results and teammate records', () => {
    const result = migrate(captured);
    expect(result.players).toHaveLength(5);
    expect(result.players.reduce((sum, p) => sum + p.wins, 0)).toBe(2);
    expect(result.matchLog).toHaveLength(1);
    expect(result.activeMatches[0].status).toBe('finished');
    expect([...result.teammateHistory]).toEqual(captured.teammateHistory);
    expect(migrate(serializeState(result))).toEqual(result);
  });
  it('preserves records and availability while dropping only broken courts', () => {
    const result = migrate(legacy);
    expect(result.schemaVersion).toBe(2);
    expect(result.events[0].format.id).toBe('openRotation');
    expect(result.players[0]).toMatchObject({ name: 'Alice', wins: 3, active: false });
    expect(result.activeMatches).toHaveLength(1);
    expect(result.activeMatches[0].sideA[0]).toBe(result.players[0]);
    expect(result.activeMatches[0].courtId).toBe('court-m');
    expect(result.teammateHistory.get('a|b')).toBe(2);
  });
  it('handles malformed fields without throwing and refuses future schema versions', () => {
    expect(
      migrate({
        players: [null, {}, { id: 'ok', name: 'Ok', wins: -9 }],
        activeMatches: [null],
        teammateHistory: [null],
      }).players,
    ).toHaveLength(1);
    expect(migrate(null).players).toEqual([]);
    expect(() => migrate({ schemaVersion: 99 })).toThrow(/version/i);
  });
  it('round trips v2 without resetting match timestamps or exposing edit tokens', () => {
    const state = migrate(legacy);
    const saved = serializeState(state);
    expect(migrate(saved)).toEqual(state);
    expect(JSON.stringify(saved)).not.toContain('editToken');
    expect(saved.activeMatches[0].generatedAt).toBe(1000);
  });
});
