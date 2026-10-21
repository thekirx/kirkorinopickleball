import { createContext, useContext, useState, type ReactNode } from 'react';
import type { MatchType } from '../../domain/types';
import { useApplication } from '../common';

// PROTOTYPE: round settings are shared by setup and play, and starting a round
// reports whether it needs the organizer's confirmation instead of using
// window.confirm, so the interface can explain what would be lost.

export type GenerateOutcome = 'started' | 'needs-confirm' | 'failed';
/** 'back' = fair open play (default); 'next' = family and friends: late arrivals play next round. */
export type LateArrivals = 'back' | 'next';

interface RoundControls {
  type: MatchType;
  setType: (type: MatchType) => void;
  courts: number;
  setCourts: (courts: number) => void;
  limit: string;
  setLimit: (limit: string) => void;
  unfinished: number;
  generate: (force?: boolean) => GenerateOutcome;
  lateArrivals: LateArrivals;
  setLateArrivals: (value: LateArrivals) => void;
  /** Applies the late-arrival rule to someone just added. Returns a sentence for the organizer. */
  placeNewPlayer: (playerId: string) => string;
}

const RoundControlsContext = createContext<RoundControls | null>(null);

export function useRoundControls() {
  const value = useContext(RoundControlsContext);
  if (!value) throw Error('RoundControls context missing');
  return value;
}

export function RoundControlsProvider({ children }: { children: ReactNode }) {
  const { data, run, notify } = useApplication();
  const [type, setType] = useState<MatchType>('doubles'),
    [courts, setCourtsRaw] = useState(2),
    [limit, setLimit] = useState('2'),
    [lateArrivals, setLateArrivals] = useState<LateArrivals>('back'),
    // Who has been prioritized during the current round, so a second late
    // arrival shares their level rather than jumping ahead of them.
    [arrivals, setArrivals] = useState<{ round: number; ids: string[] }>({ round: 0, ids: [] });
  const unfinished = data.activeMatches.filter((m) => m.status !== 'finished').length;
  const setCourts = (n: number) => setCourtsRaw(Math.max(1, Math.min(20, Math.round(n) || 1)));

  function generate(force = false): GenerateOutcome {
    // Starting a round replaces the current one; unfinished games would be
    // discarded with no result, which the original app did silently.
    if (unfinished && !force) return 'needs-confirm';
    const result = run((e) => {
      const plan = e.createRoundPlan({
        matchType: type,
        courtCount: courts,
        teammateLimit: limit === 'unlimited' ? Infinity : Number(limit),
      });
      if (plan.ok) e.applyRoundPlan(plan, type);
      return plan;
    });
    if (!result) return 'failed';
    if (!result.ok) {
      notify(result.message);
      return 'failed';
    }
    notify(
      result.reducedCourts
        ? `Round ${data.currentRound + 1} started on ${result.courtCount} of your ${result.requestedCourtCount} courts. There weren't enough people for all of them.`
        : `Round ${data.currentRound + 1} started. Teams are on the courts.`,
    );
    return 'started';
  }

  function placeNewPlayer(playerId: string) {
    // Before the first round there is no line yet, so the rule has nothing to do.
    if (!data.activeMatches.length) return '';
    if (lateArrivals === 'back') return 'They join the back of the line.';
    const sameRound = arrivals.round === data.currentRound ? arrivals.ids : [];
    run((e) => e.prioritizeForNextRound(playerId, sameRound));
    setArrivals({ round: data.currentRound, ids: [...sameRound, playerId] });
    return "They'll play in the next round.";
  }

  return (
    <RoundControlsContext.Provider
      value={{
        type,
        setType,
        courts,
        setCourts,
        limit,
        setLimit,
        unfinished,
        generate,
        lateArrivals,
        setLateArrivals,
        placeNewPlayer,
      }}
    >
      {children}
    </RoundControlsContext.Provider>
  );
}
