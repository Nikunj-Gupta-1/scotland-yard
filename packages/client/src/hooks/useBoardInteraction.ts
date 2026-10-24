"use client";

import { useState, useMemo, useCallback } from "react";
import { TacticalManager } from "@scotland-yard/common";
import type { GameEngine, GameState, PlayerRole, TicketType } from "@scotland-yard/common";
import { soundEngine } from "../lib/audio";
import type { GameMode } from "../lib/localMatch";
import type { useGameSocket } from "./useGameSocket";
import type { useScratchpad } from "./useScratchpad";

interface UseBoardInteractionArgs {
  engine: GameEngine;
  revision: number;
  bump: () => void;
  gameState: GameState;
  gameMode: GameMode;
  isReplayActive: boolean;
  isMyMultiplayerTurn: boolean;
  privacyShieldEnabled: boolean;
  setShowShield: (show: boolean) => void;
  socket: ReturnType<typeof useGameSocket>;
  scratchpad: ReturnType<typeof useScratchpad>;
}

/**
 * Reachability, station clicks, tactical targeting and move confirmation
 * for both local and multiplayer matches.
 */
export function useBoardInteraction({
  engine,
  revision,
  bump,
  gameState,
  gameMode,
  isReplayActive,
  isMyMultiplayerTurn,
  privacyShieldEnabled,
  setShowShield,
  socket,
  scratchpad
}: UseBoardInteractionArgs) {
  const activeRole: PlayerRole = gameState.activeRole;
  const activePlayer = gameState.players[activeRole];

  // Tactical abilities targeting mode
  const [targetingMode, setTargetingMode] = useState<"none" | "roadblock" | "radar">("none");
  const [lastRadarResult, setLastRadarResult] = useState<{
    stationId: number;
    detected: boolean;
  } | null>(null);

  // Move confirmation state
  const [targetStationId, setTargetStationId] = useState<number | null>(null);
  const [availableTicketsForMove, setAvailableTicketsForMove] = useState<TicketType[]>([]);

  // Calculate reachable stations for active player
  const reachableStationsData = useMemo(() => {
    if (!activePlayer || gameState.status !== "in_progress" || isReplayActive) return [];
    if (gameMode === "single_player" && activeRole === "misterX") return [];

    const isMisterX = activeRole === "misterX";
    return engine.graph.getReachableStations(
      activePlayer.station,
      activePlayer.tickets,
      isMisterX
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, activePlayer, activeRole, revision, gameState.status, gameMode, isReplayActive]);

  const reachableStationIds = useMemo(() => {
    const occupiedByDetectives = new Set<number>();
    for (const r of gameState.turnOrder) {
      if (r !== "misterX" && r !== activeRole) {
        occupiedByDetectives.add(gameState.players[r]?.station);
      }
    }
    return reachableStationsData
      .filter((r) => !occupiedByDetectives.has(r.stationId))
      .filter((r) => !TacticalManager.isStationBlocked(r.stationId, gameState))
      .map((r) => r.stationId);
  }, [reachableStationsData, gameState, activeRole]);

  // Handle station click on board
  const handleStationClick = useCallback(
    (stationId: number) => {
      if (isReplayActive) return;

      // 1. Detective Scratchpad Mode (if enabled)
      if (scratchpad.enabled) {
        scratchpad.handleStationClick(stationId);
        return;
      }

      if (gameState.status !== "in_progress") return;
      if (gameMode === "single_player" && activeRole === "misterX") return;

      // 2. Tactical: Deploy Roadblock
      if (targetingMode === "roadblock") {
        if (gameMode === "multiplayer") {
          socket.sendTacticalAction("roadblock", stationId).then((res) => {
            if (res.success) {
              soundEngine.playRoadblockDrop();
              setTargetingMode("none");
            } else {
              alert(res.error || "Cannot deploy roadblock");
            }
          });
          return;
        }
        const res = TacticalManager.deployRoadblock(stationId, activeRole, engine.state, engine.graph);
        if (res.valid) {
          soundEngine.playRoadblockDrop();
          setTargetingMode("none");
          bump();
        } else {
          alert(res.error);
        }
        return;
      }

      // 3. Tactical: Informant Radar Ping
      if (targetingMode === "radar") {
        if (gameMode === "multiplayer") {
          socket.sendTacticalAction("radar", stationId).then((res) => {
            if (res.result) {
              soundEngine.playRadarPing();
              setLastRadarResult({ stationId, detected: res.result.detected });
              setTargetingMode("none");
            } else {
              alert(res.error || "Radar ping failed");
            }
          });
          return;
        }
        const res = TacticalManager.executeRadarPing(stationId, activeRole, engine.state, engine.graph);
        if (res.result) {
          soundEngine.playRadarPing();
          setLastRadarResult({ stationId, detected: res.result.detected });
          setTargetingMode("none");
          bump();
        } else {
          alert(res.error);
        }
        return;
      }

      // 4. Standard Move Confirmation
      if (gameMode === "multiplayer" && !isMyMultiplayerTurn) {
        return;
      }

      const match = reachableStationsData.find((r) => r.stationId === stationId);
      if (match && reachableStationIds.includes(stationId)) {
        setTargetStationId(stationId);
        setAvailableTicketsForMove(match.validTickets);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      gameState.status,
      reachableStationsData,
      reachableStationIds,
      gameMode,
      activeRole,
      isMyMultiplayerTurn,
      targetingMode,
      scratchpad.enabled,
      scratchpad.activePinType,
      isReplayActive,
      engine,
      socket
    ]
  );

  // Execute confirmed move
  const handleConfirmMove = async (ticketUsed: TicketType, isDoubleMove?: boolean) => {
    if (!targetStationId) return;

    // Trigger audio SFX
    if (ticketUsed === "underground") {
      soundEngine.playSubwayRumble();
    } else if (ticketUsed === "bus") {
      soundEngine.playBusEngine();
    } else if (ticketUsed === "taxi") {
      soundEngine.playTaxiHorn();
    }
    soundEngine.playTicketClick();

    if (gameMode === "multiplayer") {
      const res = await socket.makeMove({
        playerRole: activeRole,
        toStation: targetStationId,
        ticketUsed,
        isDoubleMove
      });
      if (res.valid) {
        setTargetStationId(null);
      } else {
        alert(`Invalid move: ${res.error}`);
      }
      return;
    }

    const result = engine.executeMove({
      playerRole: activeRole,
      toStation: targetStationId,
      ticketUsed,
      isDoubleMove
    });

    if (result.valid) {
      setTargetStationId(null);
      bump();

      if (
        gameMode === "pass_and_play" &&
        privacyShieldEnabled &&
        engine.state.status === "in_progress"
      ) {
        setShowShield(true);
      }
    } else {
      alert(`Invalid move: ${result.error}`);
    }
  };

  const handleActivateDecoy = () => {
    if (gameMode === "multiplayer") {
      socket.sendTacticalAction("decoy").then((res) => {
        if (!res.success) {
          alert(res.error || "Cannot activate decoy");
        }
      });
      return;
    }
    const res = TacticalManager.activateDecoy(gameState);
    if (res.valid) {
      bump();
    } else {
      alert(res.error);
    }
  };

  /** Clears pending move/tactical UI state (new match, escape key). */
  const resetInteraction = useCallback((alsoRadar = true) => {
    setTargetStationId(null);
    setTargetingMode("none");
    if (alsoRadar) setLastRadarResult(null);
  }, []);

  return {
    targetingMode,
    setTargetingMode,
    lastRadarResult,
    targetStationId,
    setTargetStationId,
    availableTicketsForMove,
    reachableStationIds,
    handleStationClick,
    handleConfirmMove,
    handleActivateDecoy,
    resetInteraction
  };
}
