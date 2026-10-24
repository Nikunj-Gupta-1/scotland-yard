"use client";

import React, { useEffect, useRef, useCallback } from "react";
import type {
  CityMapData,
  GameState,
  PlayerRole,
  RouteEdge,
  StationNode
} from "@scotland-yard/common";
import type { Point } from "../../lib/canvasMath";
import type { StationPin } from "../scratchpad/ScratchpadToolbox";
import { buildEdgeGeometry, corridorKey } from "./boardGeometry";
import type { FrameCtx } from "./boardDraw";
import {
  drawBackground,
  drawEdges,
  drawReplayTrajectory,
  drawStations,
  drawPawns,
  drawRoadblocks,
  drawPins,
  drawSuspectPossibilityCloud,
  drawSurfacingShockwaves
} from "./boardDraw";
import { boardAnimationManager } from "./boardAnimations";
import { useCanvasSize, applyDprScaling } from "./useCanvasSize";
import { usePanZoom } from "./usePanZoom";
import { ViewportToolbar, HoverTooltip, TransitLegend } from "./BoardOverlays";

interface BoardViewportProps {
  mapData: CityMapData;
  gameState: GameState;
  activeRole: PlayerRole;
  reachableStations: number[];
  pins?: Record<number, StationPin>;
  isReplayMode?: boolean;
  replayMisterXStation?: number;
  replayTrajectory?: Array<{ from: number; to: number; round: number }>;
  focusStationId?: number | null;
  possibilityCloudStations?: number[];
  showPossibilityCloud?: boolean;
  lastSurfacedStation?: number | null;
  lastSurfacedRound?: number | null;
  cityId?: string;
  onStationClick?: (stationId: number) => void;
  onStationHover?: (stationId: number | null) => void;
}

export const BoardViewport: React.FC<BoardViewportProps> = ({
  mapData,
  gameState,
  activeRole,
  reachableStations,
  pins,
  isReplayMode,
  replayMisterXStation,
  replayTrajectory,
  focusStationId,
  possibilityCloudStations,
  showPossibilityCloud = true,
  lastSurfacedStation,
  lastSurfacedRound,
  cityId,
  onStationClick,
  onStationHover
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle Resize and Hydration Mount
  const { dimensions } = useCanvasSize(containerRef);

  // Viewport pan/zoom + hover hit-testing + toolbar actions
  const {
    viewport,
    hoveredStationId,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleFocusActive
  } = usePanZoom({
    canvasRef,
    mapData,
    gameState,
    activeRole,
    dimensions,
    focusStationId,
    onStationClick,
    onStationHover
  });

  // Pre-grouped edges to draw multi-line corridors cleanly
  const corridorMapRef = useRef<Map<string, RouteEdge[]>>(new Map());
  // Pre-calculated organic Bezier control points for all corridors
  const controlPointsRef = useRef<Map<string, Point>>(new Map());
  // Station lookup, cached alongside geometry
  const nodeLookupRef = useRef<Map<number, StationNode>>(new Map());

  // Track previous player stations and surfaced state to trigger smooth Bezier pawn glides
  const prevStationsRef = useRef<Record<string, number>>({});
  const prevSurfacedStationRef = useRef<number | null | undefined>(null);

  // Heavy geometry is built ONCE per map load, never inside the render loop
  useEffect(() => {
    const geometry = buildEdgeGeometry(mapData);
    corridorMapRef.current = geometry.corridors;
    controlPointsRef.current = geometry.controlPoints;
    nodeLookupRef.current = geometry.nodeLookup;
  }, [mapData]);

  // Detect station transitions and launch smooth Bezier pawn glides & surfacing shockwaves
  useEffect(() => {
    const prev = prevStationsRef.current;
    if (gameState.players) {
      Object.entries(gameState.players).forEach(([roleStr, player]) => {
        const role = roleStr as PlayerRole;
        const prevStation = prev[role];
        const newStation = player?.station;

        if (prevStation && newStation && prevStation !== newStation) {
          const fromNode = nodeLookupRef.current.get(prevStation);
          const toNode = nodeLookupRef.current.get(newStation);
          if (fromNode && toNode) {
            const key = corridorKey(prevStation, newStation);
            const cp = controlPointsRef.current.get(key) || {
              x: (fromNode.x + toNode.x) / 2,
              y: (fromNode.y + toNode.y) / 2
            };
            boardAnimationManager.startPawnGlide(
              role,
              prevStation,
              newStation,
              { x: fromNode.x, y: fromNode.y },
              { x: toNode.x, y: toNode.y },
              cp
            );
          }
        }
        if (newStation) {
          prev[role] = newStation;
        }
      });
    }

    if (
      lastSurfacedStation &&
      lastSurfacedStation > 0 &&
      lastSurfacedStation !== prevSurfacedStationRef.current
    ) {
      const node = nodeLookupRef.current.get(lastSurfacedStation);
      if (node) {
        boardAnimationManager.triggerSurfacingShockwave(lastSurfacedStation);
      }
    }
    prevSurfacedStationRef.current = lastSurfacedStation;
  }, [gameState.players, lastSurfacedStation]);

  // Main Draw Frame logic
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI Canvas Scaling
    applyDprScaling(canvas, ctx, dimensions.width, dimensions.height);

    const activeCityId = cityId || mapData.id || "london";
    const frame: FrameCtx = {
      ctx,
      viewport,
      width: dimensions.width,
      height: dimensions.height,
      geometry: {
        corridors: corridorMapRef.current,
        controlPoints: controlPointsRef.current,
        nodeLookup: nodeLookupRef.current
      },
      cityId: activeCityId,
      possibilityCloudStations,
      showPossibilityCloud,
      lastSurfacedStation,
      lastSurfacedRound
    };

    // 1. Tactical Cartography Map Underlay (Rivers, Parks, Watermarks)
    drawBackground(frame, mapData.width, mapData.height);

    // 2. Corridors with interactive directional pulse on hover
    const activePlayerStation = gameState.players[activeRole]?.station ?? null;
    drawEdges(frame, hoveredStationId, activePlayerStation);

    // 3. Post-game replay ribbon (if active)
    if (isReplayMode && replayTrajectory && replayTrajectory.length > 0) {
      drawReplayTrajectory(frame, replayTrajectory);
    }

    // 4. Zero-Leak Suspect Possibility Cloud (heat aura)
    if (showPossibilityCloud && possibilityCloudStations && possibilityCloudStations.length > 0) {
      drawSuspectPossibilityCloud(frame, mapData.stations);
    }

    // 5. Sonar Surfacing Shockwaves (expanding ripples)
    drawSurfacingShockwaves(frame, nodeLookupRef.current);

    // 6. Station Nodes & Prominent Landmark Badges
    drawStations(frame, mapData.stations, hoveredStationId, reachableStations);

    // 7. 3D Tabletop Pawns & "Last Seen" Ghost Silhouette
    const xStation =
      isReplayMode && replayMisterXStation
        ? replayMisterXStation
        : gameState.players.misterX?.station;
    drawPawns(frame, gameState, xStation);

    // 8. Roadblocks & Scratchpad Pins
    if (gameState.tacticalState?.roadblocks) {
      drawRoadblocks(frame, gameState.tacticalState.roadblocks);
    }
    if (pins) {
      drawPins(frame, pins);
    }
  }, [
    dimensions,
    viewport,
    mapData,
    gameState,
    hoveredStationId,
    reachableStations,
    activeRole,
    pins,
    isReplayMode,
    replayMisterXStation,
    replayTrajectory,
    cityId,
    possibilityCloudStations,
    showPossibilityCloud,
    lastSurfacedStation,
    lastSurfacedRound
  ]);

  // Continuous 60 FPS animation loop while gliding, shockwaves, or candidate hover pulses are active
  useEffect(() => {
    let animId: number;
    let isRunning = true;

    const tick = () => {
      if (!isRunning) return;
      renderFrame();

      const hasActive = boardAnimationManager.hasActiveAnimations();
      const isHoveringCandidate =
        hoveredStationId !== null && reachableStations.includes(hoveredStationId);

      // Keep animation frame pumping if animations or candidate route pulses are active
      if (hasActive || isHoveringCandidate) {
        animId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [renderFrame, hoveredStationId, reachableStations]);

  // Hovered Station Details for Tooltip
  const hoveredStation = hoveredStationId
    ? mapData.stations.find((s) => s.id === hoveredStationId)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none bg-noir-950"
      suppressHydrationWarning
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      <ViewportToolbar
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onFocusActive={handleFocusActive}
      />

      {hoveredStation && (
        <HoverTooltip
          station={hoveredStation}
          isReachable={reachableStations.includes(hoveredStation.id)}
        />
      )}

      <TransitLegend />
    </div>
  );
};
