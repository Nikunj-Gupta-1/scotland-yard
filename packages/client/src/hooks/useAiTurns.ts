"use client";

import { useEffect, useState } from "react";
import type { GameEngine, MisterXAI, PlayerRole, GameState } from "@scotland-yard/common";
import type { LocalMatchSetup } from "../components/screens/GameSetupScreen";
import { chooseDetectiveBotMove } from "../lib/localMatch";
import type { GameMode, Screen } from "../lib/localMatch";

interface UseAiTurnsArgs {
  isMounted: boolean;
  currentScreen: Screen;
  isReplayActive: boolean;
  gameMode: GameMode;
  activeRole: PlayerRole;
  status: GameState["status"];
  localSetup: LocalMatchSetup | null;
  engine: GameEngine;
  ai: MisterXAI;
  bump: () => void;
}

/** Executes Mister X AI turns and automated detective turns in single-player. */
export function useAiTurns({
  isMounted,
  currentScreen,
  isReplayActive,
  gameMode,
  activeRole,
  status,
  localSetup,
  engine,
  ai,
  bump
}: UseAiTurnsArgs): boolean {
  // AI thinking state for single-player tension
  const [isAIThinking, setIsAIThinking] = useState(false);

  useEffect(() => {
    if (!isMounted) return;
    if (currentScreen !== "game") return;
    if (isReplayActive) return;
    if (gameMode !== "single_player") return;
    if (status !== "in_progress") return;

    const isMisterXAI =
      activeRole === "misterX" && (!localSetup || localSetup.roleAssignments.misterX === -1);
    const isDetectiveAI =
      activeRole !== "misterX" && localSetup?.roleAssignments[activeRole] === -1;

    if (isMisterXAI) {
      setIsAIThinking(true);
      const timer = setTimeout(() => {
        const decision = ai.selectMove(engine.state);
        if (decision) {
          engine.executeMove(decision.action);
          if (decision.secondAction && engine.state.activeRole === "misterX") {
            engine.executeMove(decision.secondAction);
          }
          bump();
        }
        setIsAIThinking(false);
      }, 750);

      return () => clearTimeout(timer);
    } else if (isDetectiveAI) {
      setIsAIThinking(true);
      const timer = setTimeout(() => {
        const move = chooseDetectiveBotMove(engine, activeRole);
        if (move) {
          engine.executeMove(move);
          bump();
        }
        setIsAIThinking(false);
      }, 750);

      return () => clearTimeout(timer);
    }
  }, [isMounted, currentScreen, isReplayActive, gameMode, activeRole, status, ai, engine, localSetup, bump]);

  return isAIThinking;
}
