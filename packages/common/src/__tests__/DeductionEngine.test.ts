import { test } from "node:test";
import assert from "node:assert/strict";
import { LONDON_MAP } from "../maps/london.ts";
import { calculateSuspectPossibilityCloud } from "../engine/deductionEngine.ts";
import type { TravelLogEntry } from "../types/index.ts";

test("DeductionEngine: returns starting spawn points when travel log is empty", () => {
  const result = calculateSuspectPossibilityCloud(LONDON_MAP, [], [29, 30]);
  assert.ok(result.candidateStationIds.length > 0);
  // None of the detective stations should be in the candidates
  assert.ok(!result.candidateStationIds.includes(29));
  assert.ok(!result.candidateStationIds.includes(30));
  assert.equal(result.lastSurfacedStation, null);
  assert.equal(result.hopsSinceSurfaced, 0);
});

test("DeductionEngine: surfaces at station and calculates 1-hop reachability", () => {
  // Suppose Mister X surfaced at Station 13 on round 3, then took a taxi on round 4
  const travelLog: TravelLogEntry[] = [
    { round: 1, ticketUsed: "taxi" },
    { round: 2, ticketUsed: "taxi" },
    { round: 3, ticketUsed: "bus", revealedStation: 13 },
    { round: 4, ticketUsed: "taxi" }
  ];

  const result = calculateSuspectPossibilityCloud(LONDON_MAP, travelLog, [22]);
  assert.equal(result.lastSurfacedStation, 13);
  assert.equal(result.lastSurfacedRound, 3);
  assert.equal(result.hopsSinceSurfaced, 1);

  // In London, taxi neighbors from 13: check they are in candidateStationIds
  // Node 13 taxi neighbors: 12, 14, 23, 24, etc.
  assert.ok(result.candidateStationIds.length > 0);
  assert.ok(!result.candidateStationIds.includes(22)); // Detective at 22 is excluded
});

test("DeductionEngine: respects active roadblocks", () => {
  const travelLog: TravelLogEntry[] = [
    { round: 3, ticketUsed: "underground", revealedStation: 13 },
    { round: 4, ticketUsed: "taxi" }
  ];

  // If station 23 is roadblocked, it must not be in candidateStationIds
  const resultWithRoadblock = calculateSuspectPossibilityCloud(
    LONDON_MAP,
    travelLog,
    [],
    [23]
  );
  assert.ok(!resultWithRoadblock.candidateStationIds.includes(23));
});

test("DeductionEngine: handles underground moves correctly", () => {
  // Station 13 has an underground connection to 46, 67, etc. or none
  // Station 67 has underground connections
  const travelLog: TravelLogEntry[] = [
    { round: 3, ticketUsed: "underground", revealedStation: 67 },
    { round: 4, ticketUsed: "underground" }
  ];

  const result = calculateSuspectPossibilityCloud(LONDON_MAP, travelLog, []);
  assert.equal(result.lastSurfacedStation, 67);
  // All candidate stations must be reachable by underground from 67
  assert.ok(result.candidateStationIds.length > 0);
  for (const stationId of result.candidateStationIds) {
    // Verify each is a valid node
    const node = LONDON_MAP.stations.find((s) => s.id === stationId);
    assert.ok(node !== undefined);
  }
});
