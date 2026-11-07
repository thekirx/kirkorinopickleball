import { createContext, useContext, type ReactNode } from 'react';
import type { MatchType } from '../../domain/types';
import { useApplication } from '../common';

// Setup initializes courts together; subsequent games start independently on each court.

export type GenerateOutcome = 'started' | 'failed';
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
  generate: () => GenerateOutcome;
  startGame: (court: number) => boolean;
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
  const { data, store, run, notify } = useApplication();
  const { type, courts, limit, lateArrivals, arrivals } = store.gameDay;
  const setType = (type: MatchType) => store.setGameDaySettings({ type });
  const setCourts = (courts: number) => store.setGameDaySettings({ courts });
  const setLimit = (limit: string) => store.setGameDaySettings({ limit });
  const setLateArrivals = (lateArrivals: LateArrivals) =>
    store.setGameDaySettings({ lateArrivals });
  const unfinished = data.activeMatches.filter((m) => m.status !== 'finished').length;

  function generate(): GenerateOutcome {
    // Never expose the legacy whole-board replacement during ongoing play.
    if (data.currentRound > 0 || data.activeMatches.length) {
      notify('Use Start next game on a finished court.');
      return 'failed';
    }
    const result = run((e) => {
      const plan = e.createRoundPlan({
        priorityPlayerIds: store.gameDay.nextPlayerIds,
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
        ? `Games started on ${result.courtCount} of your ${result.requestedCourtCount} courts. There weren't enough people for all of them.`
        : 'Games started. Each court can finish and start its next game independently.',
    );
    return 'started';
  }

  function startGame(court: number) {
    const result = run((engine) =>
      engine.startCourtGame(court, {
        matchType: type,
        courtCount: courts,
        teammateLimit: limit === 'unlimited' ? Infinity : Number(limit),
        priorityPlayerIds: store.gameDay.nextPlayerIds,
      }),
    );
    if (result) notify(result.message);
    return result?.ok ?? false;
  }

  function placeNewPlayer(playerId: string) {
    // Before the first round there is no line yet, so the rule has nothing to do.
    if (!data.activeMatches.length) return '';
    if (lateArrivals === 'back') return 'They join the back of the line.';
    const sameRound = arrivals.round === data.currentRound ? arrivals.ids : [];
    run((e) => e.prioritizeForNextRound(playerId, sameRound));
    store.setGameDaySettings({
      arrivals: { round: data.currentRound, ids: [...sameRound, playerId] },
    });
    return "They'll get the next available game.";
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
        startGame,
        lateArrivals,
        setLateArrivals,
        placeNewPlayer,
      }}
    >
      {children}
    </RoundControlsContext.Provider>
  );
}
