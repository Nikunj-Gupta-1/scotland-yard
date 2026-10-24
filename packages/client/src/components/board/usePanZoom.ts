import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { CityMapData, GameState, PlayerRole } from "@scotland-yard/common";
import { screenToWorld, findNearestStation } from "../../lib/canvasMath";
import type { Viewport, Point } from "../../lib/canvasMath";
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from "./boardConstants";

interface Options {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  mapData: CityMapData;
  gameState: GameState;
  activeRole: PlayerRole;
  dimensions: { width: number; height: number };
  focusStationId?: number | null;
  onStationClick?: (stationId: number) => void;
  onStationHover?: (stationId: number | null) => void;
}

/**
 * Pan / zoom viewport state, mouse handlers, toolbar actions and
 * station hover hit-testing.
 */
export function usePanZoom({
  canvasRef,
  mapData,
  gameState,
  activeRole,
  dimensions,
  focusStationId,
  onStationClick,
  onStationHover
}: Options) {
  // Viewport transformation: default centered on board
  const [viewport, setViewport] = useState<Viewport>({
    x: mapData.width / 2,
    y: mapData.height / 2,
    zoom: DEFAULT_ZOOM
  });

  // Focus on station when requested by keyboard shortcut or external event
  useEffect(() => {
    if (focusStationId) {
      const node = mapData.stations.find((s) => s.id === focusStationId);
      if (node) {
        setViewport((prev) => ({
          ...prev,
          x: node.x,
          y: node.y,
          zoom: Math.max(prev.zoom, 1.0)
        }));
      }
    }
  }, [focusStationId, mapData]);

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });
  const [hoveredStationId, setHoveredStationId] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      setViewport((prev) => ({
        ...prev,
        x: prev.x - dx / prev.zoom,
        y: prev.y - dy / prev.zoom
      }));
    } else {
      // Hover hit-testing
      const worldPt = screenToWorld(mouseX, mouseY, viewport, dimensions.width, dimensions.height);
      const nearestId = findNearestStation(worldPt, mapData.stations, 20 / viewport.zoom);
      if (nearestId !== hoveredStationId) {
        setHoveredStationId(nearestId);
        onStationHover?.(nearestId);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const dx = Math.abs(e.clientX - lastMousePosRef.current.x);
      const dy = Math.abs(e.clientY - lastMousePosRef.current.y);
      // If minimal drag, treat as a click
      if (dx < 4 && dy < 4 && hoveredStationId !== null) {
        onStationClick?.(hoveredStationId);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom factor
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * zoomFactor));

    // Keep point under mouse fixed in world coordinates
    const worldBefore = screenToWorld(mouseX, mouseY, viewport, dimensions.width, dimensions.height);
    const newViewport = { ...viewport, zoom: newZoom };
    const worldAfter = screenToWorld(mouseX, mouseY, newViewport, dimensions.width, dimensions.height);

    setViewport({
      x: viewport.x + (worldBefore.x - worldAfter.x),
      y: viewport.y + (worldBefore.y - worldAfter.y),
      zoom: newZoom
    });
  };

  // Viewport Control Buttons
  const handleZoomIn = () => {
    setViewport((prev) => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom * 1.25) }));
  };

  const handleZoomOut = () => {
    setViewport((prev) => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom * 0.8) }));
  };

  const handleReset = () => {
    setViewport({
      x: mapData.width / 2,
      y: mapData.height / 2,
      zoom: DEFAULT_ZOOM
    });
  };

  const handleFocusActive = () => {
    const activePlayer = gameState.players[activeRole];
    if (activePlayer && activePlayer.station > 0) {
      const node = mapData.stations.find((s) => s.id === activePlayer.station);
      if (node) {
        setViewport({
          x: node.x,
          y: node.y,
          zoom: Math.max(1.0, viewport.zoom)
        });
      }
    }
  };

  return {
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
  };
}
