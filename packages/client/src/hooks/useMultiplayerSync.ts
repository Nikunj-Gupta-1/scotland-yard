"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { GameState } from "@scotland-yard/common";
import type { StationPin } from "../components/scratchpad/ScratchpadToolbox";
import type { PublicLobbyState, SyncedPin } from "./useGameSocket";
import type { GameMode, Screen } from "../lib/localMatch";

interface UseMultiplayerSyncArgs {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  setCurrentScreen: (screen: Screen) => void;
  setPins: Dispatch<SetStateAction<Record<number, StationPin>>>;
  multiplayerGameState: GameState | null;
  lobbyState: PublicLobbyState | null;
  remotePins: Record<number, SyncedPin>;
  resumedFromRefresh: boolean;
}

/**
 * Bridges server-pushed multiplayer data into local UI state:
 * remote scratchpad pins, game-screen transition, and session resume restore.
 * Only the server-sanitized game state is ever consumed here (Zero-Leak).
 */
export function useMultiplayerSync({
  gameMode,
  setGameMode,
  setCurrentScreen,
  setPins,
  multiplayerGameState,
  lobbyState,
  remotePins,
  resumedFromRefresh
}: UseMultiplayerSyncArgs): void {
  // Sync remote scratchpad pins from socket
  useEffect(() => {
    if (gameMode === "multiplayer" && remotePins && Object.keys(remotePins).length > 0) {
      setPins((prev) => ({ ...prev, ...remotePins }));
    }
  }, [gameMode, remotePins, setPins]);

  // Transition to game screen when multiplayer match is live
  useEffect(() => {
    if (gameMode === "multiplayer" && multiplayerGameState) {
      setCurrentScreen("game");
    }
  }, [gameMode, multiplayerGameState, setCurrentScreen]);

  // Session resume (page refresh / network drop): restore the multiplayer UI once.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!resumedFromRefresh) {
      restoredRef.current = false;
      return;
    }
    if (!lobbyState || restoredRef.current) return;
    restoredRef.current = true;
    setGameMode("multiplayer");
    // "lobby" status renders LobbyView (gameMode === multiplayer); in_game goes to the
    // game screen as soon as the sanitized multiplayerGameState is present.
    if (lobbyState.status === "in_game" && multiplayerGameState) {
      setCurrentScreen("game");
    }
  }, [resumedFromRefresh, lobbyState, multiplayerGameState, setGameMode, setCurrentScreen]);
}
