"use client";

import { useState, useMemo } from "react";
import type { GameEngine } from "@scotland-yard/common";
import { countNearMisses } from "../lib/localMatch";

/** Post-game replay viewer state and derived Mister X trajectory (local engine only). */
export function useReplay(engine: GameEngine) {
  const [isReplayActive, setIsReplayActive] = useState(false);
  const [currentReplayRound, setCurrentReplayRound] = useState(1);

  const replayTrajectory = useMemo(() => {
    if (!isReplayActive) return [];
    return engine.state.moveHistory
      .filter((m) => m.playerRole === "misterX" && m.round <= currentReplayRound)
      .map((m) => ({ from: m.fromStation, to: m.toStation, round: m.round }));
  }, [isReplayActive, currentReplayRound, engine.state.moveHistory]);

  const replayMisterXStation = useMemo(() => {
    if (!isReplayActive) return undefined;
    const moves = engine.state.moveHistory.filter(
      (m) => m.playerRole === "misterX" && m.round <= currentReplayRound
    );
    if (moves.length === 0) return engine.state.moveHistory[0]?.fromStation;
    return moves[moves.length - 1].toStation;
  }, [isReplayActive, currentReplayRound, engine.state.moveHistory]);

  // Near misses calculation in replay
  const nearMissCount = useMemo(
    () => countNearMisses(engine),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine.state.moveHistory, engine.graph]
  );

  return {
    isReplayActive,
    setIsReplayActive,
    currentReplayRound,
    setCurrentReplayRound,
    replayTrajectory,
    replayMisterXStation,
    nearMissCount
  };
}
