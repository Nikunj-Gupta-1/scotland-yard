import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../graph/Graph.ts';
import { LONDON_MAP } from '../maps/london.ts';

test('Graph initialization on London map', () => {
  const graph = new Graph(LONDON_MAP);
  assert.equal(graph.getAllNodes().length, 199, 'London map should have 199 nodes');
  assert.equal(graph.getAllEdges().length, 468, 'London map should have 468 edges');
});

test('Graph node lookup and metadata', () => {
  const graph = new Graph(LONDON_MAP);
  const node1 = graph.getNode(1);
  assert.ok(node1, 'Node 1 exists');
  assert.equal(node1?.id, 1);
  assert.ok(node1?.transports.includes('taxi'));
  assert.ok(node1?.transports.includes('bus'));
  assert.ok(node1?.transports.includes('underground'));
});

test('Graph multi-modal connections', () => {
  const graph = new Graph(LONDON_MAP);
  // Connection 1 <-> 46 is underground
  const transports = graph.getTransportsBetween(1, 46);
  assert.ok(transports.includes('underground'), 'Station 1 and 46 should connect via underground');

  // Connection 108 <-> 115 is ferry
  const ferryTransports = graph.getTransportsBetween(108, 115);
  assert.ok(ferryTransports.includes('ferry'), 'Station 108 and 115 should connect via ferry');
});

test('Graph reachability for detectives vs Mister X', () => {
  const graph = new Graph(LONDON_MAP);

  // Station 108 with only taxi tickets
  const detectiveReachableTaxiOnly = graph.getReachableStations(
    108,
    { taxi: 5, bus: 0, underground: 0, black: 0, doubleMove: 0 },
    false
  );
  // Node 115 is ferry, so taxi-only detective cannot reach 115
  assert.equal(
    detectiveReachableTaxiOnly.some(r => r.stationId === 115),
    false,
    'Detective without black ticket cannot take ferry to 115'
  );

  // Mister X with black ticket at station 108 CAN take ferry to 115
  const misterXReachableWithBlack = graph.getReachableStations(
    108,
    { taxi: 0, bus: 0, underground: 0, black: 2, doubleMove: 0 },
    true
  );
  assert.equal(
    misterXReachableWithBlack.some(r => r.stationId === 115 && r.validTickets.includes('black')),
    true,
    'Mister X with black ticket can take ferry to 115'
  );
});

test('Graph BFS shortest path and distance calculation', () => {
  const graph = new Graph(LONDON_MAP);
  const dist = graph.getDistance(1, 46);
  assert.equal(dist, 1, 'Station 1 to 46 is 1 hop direct underground');

  const path = graph.getShortestPath(1, 46);
  assert.deepEqual(path, [1, 46]);
});

test('Graph distance field from multiple origins', () => {
  const graph = new Graph(LONDON_MAP);
  const distances = graph.getDistanceFieldFromMultiple([1, 199]);
  assert.equal(distances.get(1), 0);
  assert.equal(distances.get(199), 0);
  assert.ok((distances.get(46) ?? 999) <= 1);
});
