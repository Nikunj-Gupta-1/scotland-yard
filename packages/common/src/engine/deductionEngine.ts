import type { CityMapData, TravelLogEntry } from "../types/index.ts";
import { Graph } from "../graph/Graph.ts";

export interface DeductionResult {
  candidateStationIds: number[];
  lastSurfacedStation: number | null;
  lastSurfacedRound: number | null;
  hopsSinceSurfaced: number;
}

/**
 * Mathematically calculates the exact set of stations Mister X could possibly
 * occupy right now based SOLELY on public information (misterXTravelLog + graph).
 *
 * ZERO-LEAK COMPLIANT:
 * - Uses only the public travel log ticket sequence and officially revealed stations.
 * - Filters out stations currently blocked by police roadblocks or occupied by detectives.
 * - Computes the exact perimeter without ever sniffing network payloads or secret positions.
 */
export function calculateSuspectPossibilityCloud(
  mapData: CityMapData,
  travelLog: TravelLogEntry[],
  detectiveStations: number[],
  blockedStations: number[] = []
): DeductionResult {
  const graph = new Graph(mapData);
  const occupiedSet = new Set([...detectiveStations, ...blockedStations]);

  if (!travelLog || travelLog.length === 0) {
    // Before Round 1: All possible starting stations from the official rulebook
    const candidates = mapData.startPositions.misterX.filter((s) => !occupiedSet.has(s));
    return {
      candidateStationIds: candidates,
      lastSurfacedStation: null,
      lastSurfacedRound: null,
      hopsSinceSurfaced: 0
    };
  }

  // 1. Find the most recent round where Mister X officially surfaced
  let lastSurfacedIdx = -1;
  for (let i = travelLog.length - 1; i >= 0; i--) {
    if (travelLog[i].revealedStation !== undefined && travelLog[i].revealedStation! > 0) {
      lastSurfacedIdx = i;
      break;
    }
  }

  let candidates = new Set<number>();
  let lastSurfacedStation: number | null = null;
  let lastSurfacedRound: number | null = null;
  let startIndex = 0;

  if (lastSurfacedIdx !== -1) {
    const entry = travelLog[lastSurfacedIdx];
    lastSurfacedStation = entry.revealedStation!;
    lastSurfacedRound = entry.round;
    candidates.add(lastSurfacedStation);
    startIndex = lastSurfacedIdx + 1;
  } else {
    // Has not surfaced yet (rounds 1 or 2): start from all official candidate spawn points
    for (const s of mapData.startPositions.misterX) {
      candidates.add(s);
    }
    startIndex = 0;
  }

  // 2. Propagate forward hop-by-hop using each ticket in the travel log
  for (let i = startIndex; i < travelLog.length; i++) {
    const entry = travelLog[i];
    const ticket = entry.ticketUsed;
    const nextCandidates = new Set<number>();

    for (const stationId of candidates) {
      const edges = graph.getEdgesFrom(stationId);
      for (const edge of edges) {
        let matchesTicket = false;
        if (ticket === "black") {
          matchesTicket = true;
        } else if (ticket === "taxi") {
          matchesTicket = edge.transport === "taxi";
        } else if (ticket === "bus") {
          matchesTicket = edge.transport === "bus";
        } else if (ticket === "underground") {
          matchesTicket = edge.transport === "underground";
        } else if (ticket === "doubleMove") {
          matchesTicket = true;
        }

        if (matchesTicket) {
          nextCandidates.add(edge.to);
        }
      }
    }

    candidates = nextCandidates;
  }

  // 3. Filter out currently occupied detective stations and active roadblocks
  const finalCandidates = Array.from(candidates).filter((s) => !occupiedSet.has(s));

  return {
    candidateStationIds: finalCandidates.sort((a, b) => a - b),
    lastSurfacedStation,
    lastSurfacedRound,
    hopsSinceSurfaced: travelLog.length - startIndex
  };
}
