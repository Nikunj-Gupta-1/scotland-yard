import type { GameState, StationNode } from "@scotland-yard/common";
import type { StationPin } from "../scratchpad/ScratchpadToolbox";
import {
  screenToWorld,
  worldToScreen,
  calculateCurvedLineOffsets
} from "../../lib/canvasMath";
import type { Viewport, Point } from "../../lib/canvasMath";
import type { BoardGeometry } from "./boardGeometry";
import { corridorKey } from "./boardGeometry";
import { TRANSIT_COLORS } from "./boardConstants";
import {
  getCartographyForCity,
  drawVectorRivers,
  drawVectorParks,
  drawDistrictWatermarks,
  drawLandmarkBadges
} from "./boardCartography";
import { drawTabletopPawn } from "./characterPortraits";
import { boardAnimationManager } from "./boardAnimations";

/**
 * Per-frame draw context. All geometry here is cached/precomputed;
 * draw functions only perform affine transforms and canvas strokes.
 */
export interface FrameCtx {
  ctx: CanvasRenderingContext2D;
  viewport: Viewport;
  width: number;
  height: number;
  geometry: BoardGeometry;
  cityId?: string;
  possibilityCloudStations?: number[];
  showPossibilityCloud?: boolean;
  lastSurfacedStation?: number | null;
  lastSurfacedRound?: number | null;
}

const offscreen = (p: Point, w: number, h: number, margin = 40) =>
  p.x < -margin || p.x > w + margin || p.y < -margin || p.y > h + margin;

/** Clear, blueprint grid, realistic rivers, parks, district watermarks, and board bounds. */
export function drawBackground(
  frame: FrameCtx,
  mapWidth: number,
  mapHeight: number
): void {
  const { ctx, viewport, width, height, cityId = "london" } = frame;

  // 1. Tactical Deep Noir Background Fill
  ctx.fillStyle = "#070A11";
  ctx.fillRect(0, 0, width, height);

  // 2. Blueprint Grid Watermark in World Space
  ctx.save();
  const gridSpacing = 80;
  const minWorld = screenToWorld(0, 0, viewport, width, height);
  const maxWorld = screenToWorld(width, height, viewport, width, height);

  const startX = Math.floor(minWorld.x / gridSpacing) * gridSpacing;
  const endX = Math.ceil(maxWorld.x / gridSpacing) * gridSpacing;
  const startY = Math.floor(minWorld.y / gridSpacing) * gridSpacing;
  const endY = Math.ceil(maxWorld.y / gridSpacing) * gridSpacing;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSpacing) {
    const p1 = worldToScreen(x, minWorld.y, viewport, width, height);
    const p2 = worldToScreen(x, maxWorld.y, viewport, width, height);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  for (let y = startY; y <= endY; y += gridSpacing) {
    const p1 = worldToScreen(minWorld.x, y, viewport, width, height);
    const p2 = worldToScreen(maxWorld.x, y, viewport, width, height);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();

  // 3. Board bounding rectangle
  const bTopLeft = worldToScreen(0, 0, viewport, width, height);
  const bBottomRight = worldToScreen(mapWidth, mapHeight, viewport, width, height);
  ctx.strokeStyle = "rgba(34, 47, 76, 0.6)";
  ctx.lineWidth = 2 * viewport.zoom;
  ctx.strokeRect(bTopLeft.x, bTopLeft.y, bBottomRight.x - bTopLeft.x, bBottomRight.y - bTopLeft.y);
  ctx.restore();

  // 4. Cartography Vector Geography (Parks, Waterways, District Typography)
  const cartography = getCartographyForCity(cityId);
  drawVectorParks(frame, cartography);
  drawVectorRivers(frame, cartography);
  drawDistrictWatermarks(frame, cartography);
}

/** 3. Transit corridors (edges with multi-line offsets) from cached control points. */
export function drawEdges(
  frame: FrameCtx,
  hoveredStationId: number | null = null,
  activeStationId: number | null = null
): void {
  const { ctx, viewport, width, height, geometry } = frame;
  const { corridors, controlPoints, nodeLookup } = geometry;
  const now = performance.now();

  corridors.forEach((edges) => {
    const fromNode = nodeLookup.get(edges[0].from);
    const toNode = nodeLookup.get(edges[0].to);
    if (!fromNode || !toNode) return;

    const p1 = worldToScreen(fromNode.x, fromNode.y, viewport, width, height);
    const p2 = worldToScreen(toNode.x, toNode.y, viewport, width, height);

    const cpWorld = controlPoints.get(corridorKey(edges[0].from, edges[0].to));
    const cpScreen = cpWorld
      ? worldToScreen(cpWorld.x, cpWorld.y, viewport, width, height)
      : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    // Frustum culling: skip if entirely outside viewport
    const minX = Math.min(p1.x, p2.x, cpScreen.x);
    const maxX = Math.max(p1.x, p2.x, cpScreen.x);
    const minY = Math.min(p1.y, p2.y, cpScreen.y);
    const maxY = Math.max(p1.y, p2.y, cpScreen.y);
    if (maxX < 0 || minX > width || maxY < 0 || minY > height) {
      return;
    }

    const isConnectedToHovered =
      hoveredStationId !== null &&
      (edges[0].from === hoveredStationId || edges[0].to === hoveredStationId);
    const isConnectedToActive =
      activeStationId !== null &&
      (edges[0].from === activeStationId || edges[0].to === activeStationId);
    const isDirectCandidate = isConnectedToActive && isConnectedToHovered;

    edges.forEach((edge, index) => {
      const offset = calculateCurvedLineOffsets(
        p1,
        cpScreen,
        p2,
        edges.length,
        index,
        3.5 * viewport.zoom
      );
      ctx.save();
      const baseColor = TRANSIT_COLORS[edge.transport] || "#64748B";
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = Math.max(1.4, 2.4 * viewport.zoom);

      if (edge.transport === "bus") {
        ctx.setLineDash([6 * viewport.zoom, 4 * viewport.zoom]);
      } else if (edge.transport === "ferry") {
        ctx.setLineDash([3 * viewport.zoom, 3 * viewport.zoom]);
        ctx.lineWidth = Math.max(2.2, 3.8 * viewport.zoom);
      } else if (edge.transport === "underground") {
        ctx.lineWidth = Math.max(2.2, 3.4 * viewport.zoom);
      }

      // Animated directional flow pulse if hovering candidate corridor
      if (isDirectCandidate) {
        ctx.lineWidth = Math.max(3.2, 4.5 * viewport.zoom);
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 10 * viewport.zoom;
        ctx.setLineDash([8 * viewport.zoom, 6 * viewport.zoom]);
        ctx.lineDashOffset = -((now / 30) % (14 * viewport.zoom));
      }

      ctx.beginPath();
      ctx.moveTo(offset.p1Offset.x, offset.p1Offset.y);
      ctx.quadraticCurveTo(
        offset.cpOffset.x,
        offset.cpOffset.y,
        offset.p2Offset.x,
        offset.p2Offset.y
      );
      ctx.stroke();
      ctx.restore();
    });
  });
}

/** 3.5 Post-game replay trajectory ribbon. */
export function drawReplayTrajectory(
  { ctx, viewport, width, height, geometry }: FrameCtx,
  trajectory: Array<{ from: number; to: number; round: number }>
): void {
  const { controlPoints, nodeLookup } = geometry;
  ctx.save();
  ctx.strokeStyle = "#A855F7";
  ctx.lineWidth = Math.max(3, 4.5 * viewport.zoom);
  ctx.shadowColor = "rgba(168, 85, 247, 0.9)";
  ctx.shadowBlur = 12;
  ctx.setLineDash([8 * viewport.zoom, 4 * viewport.zoom]);

  for (const leg of trajectory) {
    const n1 = nodeLookup.get(leg.from);
    const n2 = nodeLookup.get(leg.to);
    if (n1 && n2) {
      const p1 = worldToScreen(n1.x, n1.y, viewport, width, height);
      const p2 = worldToScreen(n2.x, n2.y, viewport, width, height);
      const cpWorld = controlPoints.get(corridorKey(leg.from, leg.to));
      const cpScreen = cpWorld
        ? worldToScreen(cpWorld.x, cpWorld.y, viewport, width, height)
        : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(cpScreen.x, cpScreen.y, p2.x, p2.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Draws the "Suspect Possibility Cloud" (Zero-Leak live deduction heatmap).
 * Highlights all stations Mister X could mathematically occupy based on public travel logs.
 */
export function drawSuspectPossibilityCloud(
  frame: FrameCtx,
  stations: StationNode[]
): void {
  const { ctx, viewport, width, height, possibilityCloudStations, showPossibilityCloud } = frame;
  if (!showPossibilityCloud || !possibilityCloudStations || possibilityCloudStations.length === 0) {
    return;
  }

  const candidateSet = new Set(possibilityCloudStations);
  const now = performance.now();
  const pulseFactor = 0.8 + 0.2 * Math.sin(now / 350);

  ctx.save();
  for (const station of stations) {
    if (!candidateSet.has(station.id)) continue;
    const sp = worldToScreen(station.x, station.y, viewport, width, height);
    if (offscreen(sp, width, height, 50)) continue;

    const cloudRadius = 24 * Math.max(0.6, Math.min(1.4, viewport.zoom)) * pulseFactor;

    // Glowing purple suspect aura
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, cloudRadius, 0, Math.PI * 2);
    const auraGrad = ctx.createRadialGradient(sp.x, sp.y, 4, sp.x, sp.y, cloudRadius);
    auraGrad.addColorStop(0, "rgba(168, 85, 247, 0.45)");
    auraGrad.addColorStop(0.7, "rgba(147, 51, 234, 0.18)");
    auraGrad.addColorStop(1, "rgba(126, 34, 206, 0.0)");
    ctx.fillStyle = auraGrad;
    ctx.fill();

    // Subtle dashed purple radar boundary
    ctx.strokeStyle = "rgba(192, 132, 252, 0.55)";
    ctx.lineWidth = 1.2 * viewport.zoom;
    ctx.setLineDash([3 * viewport.zoom, 3 * viewport.zoom]);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws expanding surfacing sonar shockwave ripples.
 */
export function drawSurfacingShockwaves(
  frame: FrameCtx,
  nodeLookup: Map<number, StationNode>
): void {
  const { ctx, viewport, width, height } = frame;
  const now = performance.now();
  const shockwaves = boardAnimationManager.getActiveShockwaves(now);
  if (shockwaves.length === 0) return;

  ctx.save();
  for (const sw of shockwaves) {
    const node = nodeLookup.get(sw.stationId);
    if (!node) continue;
    const sp = worldToScreen(node.x, node.y, viewport, width, height);
    if (offscreen(sp, width, height, 150)) continue;

    const progress = Math.min(1, Math.max(0, (now - sw.startTime) / sw.duration));
    const maxRadius = 140 * viewport.zoom;
    const currentRadius = progress * maxRadius;
    const alpha = (1 - progress) * 0.85;

    // Outer shockwave ring
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, currentRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
    ctx.lineWidth = 3 * (1 - progress) * viewport.zoom;
    ctx.shadowColor = "#A855F7";
    ctx.shadowBlur = 16 * viewport.zoom;
    ctx.stroke();

    // Inner secondary ripple
    if (progress > 0.25) {
      const innerRadius = (progress - 0.25) * 1.33 * maxRadius;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, innerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(216, 180, 254, ${alpha * 0.7})`;
      ctx.lineWidth = 2 * viewport.zoom;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** 4. Station nodes (reachable glow, transport rings, core, id label). */
export function drawStations(
  frame: FrameCtx,
  stations: StationNode[],
  hoveredStationId: number | null,
  reachableStations: number[]
): void {
  const { ctx, viewport, width, height } = frame;
  for (const station of stations) {
    const sp = worldToScreen(station.x, station.y, viewport, width, height);

    // Cull nodes offscreen
    if (offscreen(sp, width, height)) {
      continue;
    }

    const isHovered = hoveredStationId === station.id;
    const isReachable = reachableStations.includes(station.id);
    const baseRadius = (isHovered ? 14 : 11) * Math.max(0.6, Math.min(1.4, viewport.zoom));

    ctx.save();

    // Reachable Station Radial Pulse
    if (isReachable) {
      drawReachableGlow(ctx, sp, baseRadius, viewport.zoom);
    }

    // Outer Transport Rings
    const numTransports = station.transports.length;
    if (numTransports > 0) {
      const arcStep = (Math.PI * 2) / numTransports;
      station.transports.forEach((transport, tIdx) => {
        ctx.beginPath();
        ctx.arc(
          sp.x,
          sp.y,
          baseRadius + 2.5 * viewport.zoom,
          tIdx * arcStep,
          (tIdx + 1) * arcStep - 0.15
        );
        ctx.strokeStyle = TRANSIT_COLORS[transport];
        ctx.lineWidth = Math.max(1.8, 2.5 * viewport.zoom);
        ctx.stroke();
      });
    }

    // Inner Core Circle
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = isHovered ? "#1E293B" : "#0F172A";
    ctx.fill();
    ctx.strokeStyle = isHovered ? "#38BDF8" : "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = isHovered ? 2 * viewport.zoom : 1;
    ctx.stroke();

    // Station ID Number
    if (viewport.zoom > 0.45 || isHovered || isReachable) {
      ctx.fillStyle = isHovered ? "#F8FAFC" : "#94A3B8";
      ctx.font = `600 ${Math.max(8, Math.round(9 * viewport.zoom))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(station.id.toString(), sp.x, sp.y);
    }

    ctx.restore();
  }

  // Draw landmark callout badges over prominent hubs
  const cartography = getCartographyForCity(frame.cityId || "london");
  drawLandmarkBadges(frame, cartography, hoveredStationId);
}

/** Radial pulse around a reachable station (caller owns save/restore). */
export function drawReachableGlow(
  ctx: CanvasRenderingContext2D,
  sp: Point,
  baseRadius: number,
  zoom: number
): void {
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, baseRadius + 7 * zoom, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
  ctx.fill();
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 1.5 * zoom;
  ctx.setLineDash([4 * zoom, 2 * zoom]);
  ctx.stroke();
}

/**
 * 5. Player tokens with 3D brass/enamel rendering and smooth Bezier gliding animations.
 * Zero-Leak rule: Mister X is only drawn when `xStation > 0`.
 */
export function drawPawns(
  frame: FrameCtx,
  gameState: GameState,
  xStation: number | undefined
): void {
  const { ctx, viewport, width, height, geometry } = frame;
  const { nodeLookup } = geometry;
  const now = performance.now();

  // Render Detectives with 3D Brass/Enamel finish and smooth gliding
  Object.values(gameState.players).forEach((player) => {
    if (player.role === "misterX") return;

    // Check if actively gliding along Bezier curve
    const glidingPos = boardAnimationManager.getGlidingPawnPosition(player.role, now);
    let pp: Point;

    if (glidingPos) {
      pp = worldToScreen(glidingPos.x, glidingPos.y, viewport, width, height);
      // Motion trail
      ctx.save();
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 8 * viewport.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.shadowColor = "#FFFFFF";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    } else {
      const st = nodeLookup.get(player.station);
      if (!st) return;
      pp = worldToScreen(st.x, st.y, viewport, width, height);
    }

    if (offscreen(pp, width, height, 40)) return;

    const isCurrentTurn = gameState.activeRole === player.role;
    drawTabletopPawn(ctx, pp.x, pp.y, player.role, isCurrentTurn, viewport.zoom);
  });

  // Render Mister X (Only visible if station is known: surfaced, spectator, game over, or in replay mode)
  if (xStation && xStation > 0) {
    const glidingPos = boardAnimationManager.getGlidingPawnPosition("misterX", now);
    let xp: Point;

    if (glidingPos) {
      xp = worldToScreen(glidingPos.x, glidingPos.y, viewport, width, height);
      // Sinister purple phantom trail
      ctx.save();
      ctx.beginPath();
      ctx.arc(xp.x, xp.y, 10 * viewport.zoom, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 85, 247, 0.4)";
      ctx.shadowColor = "#A855F7";
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.restore();
    } else {
      const st = nodeLookup.get(xStation);
      if (!st) return;
      xp = worldToScreen(st.x, st.y, viewport, width, height);
    }

    if (!offscreen(xp, width, height, 40)) {
      const isCurrentTurn = gameState.activeRole === "misterX";
      drawTabletopPawn(ctx, xp.x, xp.y, "misterX", isCurrentTurn, viewport.zoom);
    }
  } else if (frame.lastSurfacedStation && frame.lastSurfacedStation > 0) {
    // Mister X is currently hidden, but surfaced in an earlier round:
    // Render the "Last Seen" Ghost Silhouette token!
    drawGhostToken(frame, frame.lastSurfacedStation, frame.lastSurfacedRound || 3);
  }
}

/**
 * Draws a translucent "Last Seen" ghost apparition silhouette at Mister X's last surfaced station.
 */
export function drawGhostToken(
  frame: FrameCtx,
  stationId: number,
  round: number
): void {
  const { ctx, viewport, width, height, geometry } = frame;
  const st = geometry.nodeLookup.get(stationId);
  if (!st) return;

  const gp = worldToScreen(st.x, st.y, viewport, width, height);
  if (offscreen(gp, width, height, 40)) return;

  const radius = 14 * Math.max(0.7, Math.min(1.3, viewport.zoom));
  const now = performance.now();
  const floatY = gp.y + Math.sin(now / 400) * 3 * viewport.zoom;

  ctx.save();

  // Translucent ghost halo
  ctx.beginPath();
  ctx.arc(gp.x, floatY, radius + 6 * viewport.zoom, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(168, 85, 247, 0.18)";
  ctx.fill();
  ctx.strokeStyle = "rgba(192, 132, 252, 0.6)";
  ctx.lineWidth = 1.5 * viewport.zoom;
  ctx.setLineDash([3 * viewport.zoom, 3 * viewport.zoom]);
  ctx.stroke();

  // Ghost token body
  ctx.beginPath();
  ctx.arc(gp.x, floatY, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(30, 27, 75, 0.85)";
  ctx.fill();
  ctx.strokeStyle = "#A855F7";
  ctx.lineWidth = 1.8 * viewport.zoom;
  ctx.setLineDash([]);
  ctx.stroke();

  // Silhouette "X"
  ctx.fillStyle = "#E9D5FF";
  ctx.font = `900 ${Math.round(11 * viewport.zoom)}px ui-sans-serif, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("X", gp.x, floatY);

  // Callout banner badge
  const badgeY = floatY - 20 * viewport.zoom;
  const text = `LAST SEEN: R${round}`;
  ctx.font = `bold ${Math.round(8.5 * viewport.zoom)}px ui-monospace, monospace`;
  const textWidth = ctx.measureText(text).width;
  const pad = 4 * viewport.zoom;

  ctx.beginPath();
  ctx.roundRect(gp.x - textWidth / 2 - pad, badgeY - 7 * viewport.zoom, textWidth + pad * 2, 14 * viewport.zoom, 4);
  ctx.fillStyle = "rgba(15, 10, 30, 0.9)";
  ctx.fill();
  ctx.strokeStyle = "#A855F7";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#E9D5FF";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, gp.x, badgeY);

  ctx.restore();
}

/** 6. Active police roadblocks. */
export function drawRoadblocks(
  { ctx, viewport, width, height, geometry }: FrameCtx,
  roadblocks: Array<{ stationId: number; roundsRemaining: number }>
): void {
  for (const rb of roadblocks) {
    const st = geometry.nodeLookup.get(rb.stationId);
    if (!st) continue;
    const rp = worldToScreen(st.x, st.y, viewport, width, height);

    if (offscreen(rp, width, height)) continue;

    ctx.save();
    const rSize = 16 * Math.max(0.7, Math.min(1.4, viewport.zoom));

    // Pulsing barrier ring
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rSize + 4 * viewport.zoom, 0, Math.PI * 2);
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2 * viewport.zoom;
    ctx.setLineDash([4 * viewport.zoom, 3 * viewport.zoom]);
    ctx.stroke();

    // Barrier Core Badge
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rSize, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(180, 83, 9, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "#FBBF24";
    ctx.lineWidth = 1.5 * viewport.zoom;
    ctx.stroke();

    // Barrier Countdown text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.round(10 * viewport.zoom)}px ui-monospace, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`🚧${rb.roundsRemaining}R`, rp.x, rp.y);

    ctx.restore();
  }
}

/** 7. Detective scratchpad pins. */
export function drawPins(
  { ctx, viewport, width, height, geometry }: FrameCtx,
  pins: Record<number, StationPin>
): void {
  Object.values(pins).forEach((pin) => {
    const st = geometry.nodeLookup.get(pin.stationId);
    if (!st) return;
    const pp = worldToScreen(st.x, st.y, viewport, width, height);

    if (offscreen(pp, width, height)) return;

    ctx.save();
    const pinRadius = 10 * Math.max(0.7, Math.min(1.4, viewport.zoom));
    const badgeY = pp.y - 17 * viewport.zoom;

    // Pin background circle
    ctx.beginPath();
    ctx.arc(pp.x, badgeY, pinRadius, 0, Math.PI * 2);
    if (pin.type === "flag") ctx.fillStyle = "#EF4444";
    else if (pin.type === "question") ctx.fillStyle = "#F59E0B";
    else if (pin.type === "cross") ctx.fillStyle = "#64748B";
    else ctx.fillStyle = "#3B82F6";
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pin symbol text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.round(9 * viewport.zoom)}px -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const symbol =
      pin.type === "flag"
        ? "🚩"
        : pin.type === "question"
        ? "?"
        : pin.type === "cross"
        ? "✕"
        : "📝";
    ctx.fillText(symbol, pp.x, badgeY);

    ctx.restore();
  });
}
