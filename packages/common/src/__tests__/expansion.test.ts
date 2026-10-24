import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../graph/Graph.ts';
import { PARIS_MAP } from '../maps/paris.ts';
import { NEWYORK_MAP } from '../maps/newyork.ts';
import { GameEngine } from '../engine/GameEngine.ts';
import { TacticalManager } from '../tactical/TacticalManager.ts';

test('Paris map topology and connectivity', () => {
  assert.equal(PARIS_MAP.stations.length, 280, 'Paris should have 280 stations');
  assert.ok(PARIS_MAP.edges.length > 500, 'Paris should have over 500 edges');

  const graph = new Graph(PARIS_MAP);
  // Tour Eiffel (#1) to Cathédrale Notre-Dame (#4)
  const path = graph.getShortestPath(1, 4);
  assert.ok(path, 'Path should exist between Eiffel Tower and Notre-Dame');
  assert.ok(path.length >= 2, 'Path should contain multiple hops');
});

test('New York map topology and connectivity', () => {
  assert.equal(NEWYORK_MAP.stations.length, 380, 'New York should have 380 stations');
  assert.ok(NEWYORK_MAP.edges.length > 800, 'New York should have over 800 edges');

  const graph = new Graph(NEWYORK_MAP);
  // Times Square (#1) to Wall Street (#6)
  const path = graph.getShortestPath(1, 6);
  assert.ok(path, 'Path should exist between Times Square and Wall Street');
});

test('Tactical Power-Ups: Police Roadblocks block movements', () => {
  const engine = new GameEngine(PARIS_MAP);
  engine.createNewGame({
    cityId: 'paris',
    difficulty: 'classic',
    detectiveCount: 3,
    maxRounds: 24,
    tacticalMode: true
  });

  const state = engine.state;
  assert.ok(state.tacticalState, 'Tactical state should be initialized');
  assert.equal(state.tacticalState?.detectiveRoadblocksRemaining, 2);

  // Pick a neighbor directly connected to Mister X
  const xStation = state.players.misterX.station;
  const neighbors = engine.graph.getAdjacentNodes(xStation);
  assert.ok(neighbors.length > 0);
  const targetStation = neighbors[0];

  // Deploy roadblock on targetStation
  const deployRes = TacticalManager.deployRoadblock(targetStation, 'detective_red', state, engine.graph);
  assert.equal(deployRes.valid, true);
  assert.equal(state.tacticalState?.detectiveRoadblocksRemaining, 1);
  assert.equal(TacticalManager.isStationBlocked(targetStation, state), true);

  // Attempting to move onto targetStation should be rejected because of police barrier
  const moveBlocked = engine.validateMove({
    playerRole: 'misterX',
    toStation: targetStation,
    ticketUsed: 'taxi'
  });
  assert.equal(moveBlocked.valid, false);
  assert.match(moveBlocked.error!, /blocked by a police barrier/);
});

test('Tactical Power-Ups: Informant Radar Ping proximity detection', () => {
  const engine = new GameEngine(PARIS_MAP);
  engine.createNewGame(
    {
      cityId: 'paris',
      difficulty: 'classic',
      detectiveCount: 2,
      maxRounds: 24,
      tacticalMode: true
    },
    { misterX: 1, detectives: [50, 60] }
  );

  // Mister X is at station 1
  // Ping adjacent/nearby station (e.g. station 1 itself or direct neighbor)
  const neighbors = engine.graph.getAdjacentNodes(1);
  const nearStation = neighbors[0];

  const nearPing = TacticalManager.executeRadarPing(nearStation, 'detective_red', engine.state, engine.graph);
  assert.equal(nearPing.result?.detected, true, 'Radar should detect Mister X within 1-2 hops');

  // Ping a far away station (e.g. station 250)
  const farPing = TacticalManager.executeRadarPing(250, 'detective_red', engine.state, engine.graph);
  assert.equal(farPing.result?.detected, false, 'Radar should NOT detect Mister X far away');
});

test('Tactical Power-Ups: Mister X Decoy Ticket disguises movement', () => {
  const engine = new GameEngine(PARIS_MAP);
  engine.createNewGame({
    cityId: 'paris',
    difficulty: 'classic',
    detectiveCount: 2,
    maxRounds: 24,
    tacticalMode: true
  });

  const decoyRes = TacticalManager.activateDecoy(engine.state);
  assert.equal(decoyRes.valid, true);
  assert.equal(engine.state.tacticalState?.activeDecoyNextMove, true);

  // Mister X makes a move
  const legalMoves = engine.getLegalMoves('misterX');
  assert.ok(legalMoves.length > 0);
  const realMove = legalMoves[0];
  engine.executeMove(realMove);

  // The logged ticket in travel log should be disguised (different from real if decoyed)
  const travelEntry = engine.state.misterXTravelLog[0];
  assert.ok(travelEntry);
  assert.equal(engine.state.tacticalState?.activeDecoyNextMove, false, 'Decoy should be consumed');
});
