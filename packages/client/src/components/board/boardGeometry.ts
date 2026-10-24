import type { CityMapData, RouteEdge, StationNode } from "@scotland-yard/common";
import { computeEdgeControlPoint } from "../../lib/canvasMath";
import type { Point } from "../../lib/canvasMath";

export interface BoardGeometry {
  /** Edges grouped per station pair (key `${min}-${max}`) for multi-line corridors */
  corridors: Map<string, RouteEdge[]>;
  /** Pre-calculated organic Bezier control points (world space) per corridor */
  controlPoints: Map<string, Point>;
  /** Station id -> node lookup */
  nodeLookup: Map<number, StationNode>;
}

export const corridorKey = (a: number, b: number): string =>
  `${Math.min(a, b)}-${Math.max(a, b)}`;

/**
 * Heavy precompute (obstacle-avoiding control points, corridor grouping).
 * Call ONLY on map load / change — never inside requestAnimationFrame.
 */
export function buildEdgeGeometry(mapData: CityMapData): BoardGeometry {
  const corridors = new Map<string, RouteEdge[]>();
  const controlPoints = new Map<string, Point>();
  const nodeLookup = new Map<number, StationNode>();
  for (const st of mapData.stations) {
    nodeLookup.set(st.id, st);
  }
  const allStations = mapData.stations.map((s) => ({ x: s.x, y: s.y }));

  for (const edge of mapData.edges) {
    const u = Math.min(edge.from, edge.to);
    const v = Math.max(edge.from, edge.to);
    const key = `${u}-${v}`;
    if (!corridors.has(key)) {
      corridors.set(key, []);
    }
    corridors.get(key)!.push(edge);

    if (!controlPoints.has(key)) {
      const n1 = nodeLookup.get(u);
      const n2 = nodeLookup.get(v);
      if (n1 && n2) {
        const cp = computeEdgeControlPoint(
          { x: n1.x, y: n1.y },
          { x: n2.x, y: n2.y },
          edge.transport,
          allStations
        );
        controlPoints.set(key, cp);
      }
    }
  }
  return { corridors, controlPoints, nodeLookup };
}
