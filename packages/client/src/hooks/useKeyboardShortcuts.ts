"use client";

import { useEffect, useRef } from "react";
import type { GameState } from "@scotland-yard/common";

interface KeyboardShortcutHandlers {
  onEscape: () => void;
  onFocusStation: (stationId: number) => void;
  onToggleScratchpad: () => void;
  onToggleMute: () => void;
  onToggleRulebook: () => void;
}

const DETECTIVE_KEYS: Record<string, "detective_red" | "detective_green" | "detective_yellow" | "detective_blue" | "detective_purple"> = {
  "1": "detective_red",
  "2": "detective_green",
  "3": "detective_yellow",
  "4": "detective_blue",
  "5": "detective_purple"
};

/** Global keyboard shortcuts (Esc, Space, 1-5, S, M, ?). */
export function useKeyboardShortcuts(
  gameState: Pick<GameState, "activeRole" | "players">,
  handlers: KeyboardShortcutHandlers
): void {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const h = handlersRef.current;

      if (e.key === "Escape") {
        h.onEscape();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        const activeStn = gameState.players[gameState.activeRole]?.station;
        if (activeStn && activeStn > 0) h.onFocusStation(activeStn);
      } else if (DETECTIVE_KEYS[e.key]) {
        const s = gameState.players[DETECTIVE_KEYS[e.key]]?.station;
        if (s && s > 0) h.onFocusStation(s);
      } else if (e.key === "s" || e.key === "S") {
        h.onToggleScratchpad();
      } else if (e.key === "m" || e.key === "M") {
        h.onToggleMute();
      } else if (e.key === "?" || e.key === "/") {
        h.onToggleRulebook();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState.activeRole, gameState.players]);
}
