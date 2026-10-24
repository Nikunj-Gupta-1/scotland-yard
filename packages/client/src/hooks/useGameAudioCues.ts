"use client";

import { useEffect } from "react";
import { soundEngine } from "../lib/audio";

/** Plays surfacing-alarm and victory/defeat SFX in response to game state changes. */
export function useGameAudioCues(args: {
  isMounted: boolean;
  currentRound: number;
  surfacingRounds: number[];
  status: string;
}): void {
  const { isMounted, currentRound, surfacingRounds, status } = args;

  // Audio SFX on Surfacing Rounds
  useEffect(() => {
    if (!isMounted) return;
    if (surfacingRounds.includes(currentRound)) {
      soundEngine.playSurfacingAlarm();
    }
  }, [currentRound, surfacingRounds, isMounted]);

  // Audio SFX on Game Victory / Over
  useEffect(() => {
    if (!isMounted) return;
    if (status === "detectives_won") {
      soundEngine.playCaptureFanfare();
    } else if (status === "mister_x_won") {
      soundEngine.playEscapeFanfare();
    }
  }, [status, isMounted]);
}
