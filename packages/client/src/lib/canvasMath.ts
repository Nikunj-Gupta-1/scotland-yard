export interface Viewport {
  x: number;      // World X at screen center
  y: number;      // World Y at screen center
  zoom: number;   // Zoom level (e.g. 1.0)
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Transforms screen coordinates (e.g. clientX, clientY relative to canvas rect)
 * into world board coordinates.
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number
): Point {
  const worldX = viewport.x + (screenX - canvasWidth / 2) / viewport.zoom;
  const worldY = viewport.y + (screenY - canvasHeight / 2) / viewport.zoom;
  return { x: worldX, y: worldY };
}

/**
 * Transforms world board coordinates into screen coordinates.
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number
): Point {
  const screenX = canvasWidth / 2 + (worldX - viewport.x) * viewport.zoom;
  const screenY = canvasHeight / 2 + (worldY - viewport.y) * viewport.zoom;
  return { x: screenX, y: screenY };
}

/**
 * Finds the station closest to the world coordinate within a maximum threshold.
 */
export function findNearestStation(
  worldPoint: Point,
  stations: Array<{ id: number; x: number; y: number }>,
  maxDistance = 24
): number | null {
  let closestId: number | null = null;
  let minDistanceSq = maxDistance * maxDistance;

  for (const station of stations) {
    const dx = station.x - worldPoint.x;
    const dy = station.y - worldPoint.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      closestId = station.id;
    }
  }

  return closestId;
}

/**
 * Calculates perpendicular offsets for parallel lines between two points.
 * Used when multiple transit modes (Taxi, Bus, Underground) share the same corridor.
 */
export function calculateLineOffsets(
  p1: Point,
  p2: Point,
  totalLines: number,
  lineIndex: number,
  spacing = 4
): { p1Offset: Point; p2Offset: Point } {
  if (totalLines <= 1) {
    return { p1Offset: { ...p1 }, p2Offset: { ...p2 } };
  }

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);

  if (len === 0) {
    return { p1Offset: { ...p1 }, p2Offset: { ...p2 } };
  }

  // Unit normal vector perpendicular to line
  const nx = -dy / len;
  const ny = dx / len;

  // Center offset around 0: e.g. for 2 lines: -0.5, +0.5; for 3 lines: -1, 0, +1
  const offsetDistance = (lineIndex - (totalLines - 1) / 2) * spacing;

  return {
    p1Offset: {
      x: p1.x + nx * offsetDistance,
      y: p1.y + ny * offsetDistance
    },
    p2Offset: {
      x: p2.x + nx * offsetDistance,
      y: p2.y + ny * offsetDistance
    }
  };
}

/**
 * Computes a quadratic Bezier control point for an edge between two stations.
 * Gives realistic transit curves and bows outward around intermediate stations to prevent false intersections.
 */
export function computeEdgeControlPoint(
  p1: Point,
  p2: Point,
  transport: string,
  obstacles: Point[] = []
): Point {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);

  if (len < 10) {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  // Midpoint
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;

  // Unit normal perpendicular to chord
  const nx = -dy / len;
  const ny = dx / len;

  // Baseline curvature based on transit network
  let baseDisplacement = 0;
  if (transport === "underground") {
    baseDisplacement = Math.min(len * 0.14, 42);
  } else if (transport === "ferry") {
    baseDisplacement = Math.min(len * 0.18, 48);
  } else if (transport === "bus") {
    baseDisplacement = Math.min(len * 0.08, 24);
  } else {
    // Taxi: gentle subtle curve
    baseDisplacement = Math.min(len * 0.04, 12);
  }

  // Deterministic direction alternating based on coordinate seed
  const sign = Math.sin(p1.x * 12.9898 + p1.y * 78.233 + p2.x * 37.719) > 0 ? 1 : -1;
  let displacement = baseDisplacement * sign;

  // Obstacle avoidance: check if straight path passes near any unrelated station
  const clearanceRadius = 26;
  for (const obs of obstacles) {
    const vx = obs.x - p1.x;
    const vy = obs.y - p1.y;
    // Project obstacle onto line segment
    const t = (vx * dx + vy * dy) / (len * len);
    if (t > 0.08 && t < 0.92) {
      // Perpendicular distance to chord
      const projX = p1.x + t * dx;
      const projY = p1.y + t * dy;
      const distToLine = Math.hypot(obs.x - projX, obs.y - projY);

      if (distToLine < clearanceRadius) {
        // Obstacle is on path! Determine which side of the line it sits on
        const side = (obs.x - p1.x) * ny - (obs.y - p1.y) * nx;
        const pushDir = side >= 0 ? -1 : 1; // push to opposite side
        const neededPush = (clearanceRadius - distToLine + 14) * pushDir;

        // If current displacement doesn't clear, expand displacement
        if (Math.sign(displacement) === Math.sign(neededPush)) {
          if (Math.abs(neededPush) > Math.abs(displacement)) {
            displacement = neededPush;
          }
        } else {
          displacement = neededPush;
        }
      }
    }
  }

  return {
    x: mx + nx * displacement,
    y: my + ny * displacement
  };
}

/**
 * Calculates perpendicular offsets along a curved Bezier arc for parallel multi-modal tracks.
 */
export function calculateCurvedLineOffsets(
  p1: Point,
  cp: Point,
  p2: Point,
  totalLines: number,
  lineIndex: number,
  spacing = 4
): { p1Offset: Point; cpOffset: Point; p2Offset: Point } {
  if (totalLines <= 1) {
    return {
      p1Offset: { ...p1 },
      cpOffset: { ...cp },
      p2Offset: { ...p2 }
    };
  }

  const offsetDistance = (lineIndex - (totalLines - 1) / 2) * spacing;

  // Tangent / normal at p1
  const d1x = cp.x - p1.x;
  const d1y = cp.y - p1.y;
  const l1 = Math.hypot(d1x, d1y) || 1;
  const n1x = -d1y / l1;
  const n1y = d1x / l1;

  // Tangent / normal at p2
  const d2x = p2.x - cp.x;
  const d2y = p2.y - cp.y;
  const l2 = Math.hypot(d2x, d2y) || 1;
  const n2x = -d2y / l2;
  const n2y = d2x / l2;

  // Tangent / normal at cp
  const dcx = p2.x - p1.x;
  const dcy = p2.y - p1.y;
  const lc = Math.hypot(dcx, dcy) || 1;
  const ncx = -dcy / lc;
  const ncy = dcx / lc;

  return {
    p1Offset: { x: p1.x + n1x * offsetDistance, y: p1.y + n1y * offsetDistance },
    cpOffset: { x: cp.x + ncx * offsetDistance, y: cp.y + ncy * offsetDistance },
    p2Offset: { x: p2.x + n2x * offsetDistance, y: p2.y + n2y * offsetDistance }
  };
}
