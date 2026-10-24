import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../engine/GameEngine.ts';
import { LONDON_MAP } from '../maps/london.ts';

test('GameEngine initialization with authentic Scotland Yard rules', () => {
  const engine = new GameEngine(LONDON_MAP);
  const state = engine.state;

  assert.equal(state.status, 'in_progress');
  assert.equal(state.currentRound, 1);
  assert.equal(state.activeRole, 'misterX');
  assert.equal(state.turnOrder.length, 6, '1 Mister X + 5 Detectives');

  // Check detective ticket allocation
  const redDetective = state.players.detective_red;
  assert.equal(redDetective.tickets.taxi, 10);
  assert.equal(redDetective.tickets.bus, 8);
  assert.equal(redDetective.tickets.underground, 4);
  assert.equal(redDetective.tickets.black, 0);

  // Check Mister X ticket allocation
  const misterX = state.players.misterX;
  assert.equal(misterX.tickets.taxi, 4);
  assert.equal(misterX.tickets.bus, 3);
  assert.equal(misterX.tickets.underground, 3);
  assert.equal(misterX.tickets.black, 5);
  assert.equal(misterX.tickets.doubleMove, 2);
});

test('Move validation rejects illegal moves', () => {
  const engine = new GameEngine(LONDON_MAP);

  // 1. Wrong turn order
  const wrongTurn = engine.validateMove({
    playerRole: 'detective_red',
    toStation: 1,
    ticketUsed: 'taxi'
  });
  assert.equal(wrongTurn.valid, false);
  assert.match(wrongTurn.error!, /It is not detective_red's turn/);

  // 2. Disconnected station
  const xStation = engine.state.players.misterX.station;
  // Node 199 is far away from most start stations
  const farAwayStation = xStation === 199 ? 1 : 199;
  const disconnected = engine.validateMove({
    playerRole: 'misterX',
    toStation: farAwayStation,
    ticketUsed: 'taxi'
  });
  assert.equal(disconnected.valid, false);
  assert.match(disconnected.error!, /No route exists/);
});

test('Move execution, ticket consumption, and ticket transfer to Mister X', () => {
  // Fix start stations for deterministic testing
  // Station 1 connects to 8 (taxi), 9 (taxi), 46 (underground)
  // Station 46 connects to 1 (underground), 13 (underground), 74 (underground), 79 (underground), etc.
  const engine = new GameEngine(LONDON_MAP);
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 3, maxRounds: 24 },
    { misterX: 1, detectives: [46, 79, 89] }
  );

  const initialXTaxi = engine.state.players.misterX.tickets.taxi;
  const initialDetRedTaxi = engine.state.players.detective_red.tickets.taxi;

  // Mister X moves from 1 to 8 using taxi
  const moveX = engine.executeMove({
    playerRole: 'misterX',
    toStation: 8,
    ticketUsed: 'taxi'
  });
  assert.equal(moveX.valid, true);
  assert.equal(engine.state.players.misterX.station, 8);
  assert.equal(engine.state.players.misterX.tickets.taxi, initialXTaxi - 1);
  assert.equal(engine.state.activeRole, 'detective_red');

  // Detective Red moves from 46 to 74 using underground
  const moveDetRed = engine.executeMove({
    playerRole: 'detective_red',
    toStation: 74,
    ticketUsed: 'underground'
  });
  assert.equal(moveDetRed.valid, true);
  assert.equal(engine.state.players.detective_red.station, 74);
  assert.equal(engine.state.players.detective_red.tickets.underground, 4 - 1);
  // Key Scotland Yard Rule: Detective underground ticket surrendered to Mister X!
  assert.equal(engine.state.players.misterX.tickets.underground, 3 + 1);
});

test('Surfacing rounds reveal Mister X station in travel log', () => {
  const engine = new GameEngine(LONDON_MAP);
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 1, maxRounds: 24 },
    { misterX: 1, detectives: [100] }
  );

  // Round 1: Mister X moves 1 -> 8 (taxi)
  engine.executeMove({ playerRole: 'misterX', toStation: 8, ticketUsed: 'taxi' });
  assert.equal(engine.state.misterXTravelLog[0].revealedStation, undefined, 'Round 1 is secret');

  // Advance detective to end Round 1
  const det1Moves = engine.getLegalMoves('detective_red');
  engine.executeMove(det1Moves[0]);
  assert.equal(engine.state.currentRound, 2);

  // Round 2: Mister X moves 8 -> 1 (taxi)
  engine.executeMove({ playerRole: 'misterX', toStation: 1, ticketUsed: 'taxi' });
  assert.equal(engine.state.misterXTravelLog[1].revealedStation, undefined, 'Round 2 is secret');

  // Advance detective to end Round 2
  const det2Moves = engine.getLegalMoves('detective_red');
  engine.executeMove(det2Moves[0]);
  assert.equal(engine.state.currentRound, 3);

  // Round 3 is a surfacing round!
  engine.executeMove({ playerRole: 'misterX', toStation: 8, ticketUsed: 'taxi' });
  assert.equal(engine.state.misterXTravelLog[2].revealedStation, 8, 'Round 3 MUST reveal station 8');
});

test('Double Move (2x) allows Mister X two consecutive moves', () => {
  const engine = new GameEngine(LONDON_MAP);
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 2, maxRounds: 24 },
    { misterX: 1, detectives: [100, 101] }
  );

  assert.equal(engine.state.players.misterX.tickets.doubleMove, 2);

  // First move of double move: 1 -> 8 (taxi)
  const move1 = engine.executeMove({
    playerRole: 'misterX',
    toStation: 8,
    ticketUsed: 'taxi',
    isDoubleMove: true
  });
  assert.equal(move1.valid, true);
  assert.equal(engine.state.players.misterX.tickets.doubleMove, 1);
  // Still Mister X's turn!
  assert.equal(engine.state.activeRole, 'misterX');

  // Second move of double move: 8 -> 1 (taxi)
  const move2 = engine.executeMove({
    playerRole: 'misterX',
    toStation: 1,
    ticketUsed: 'taxi'
  });
  assert.equal(move2.valid, true);
  // Now passes to detective red
  assert.equal(engine.state.activeRole, 'detective_red');
  // A double move consumes two rounds, each logged separately
  assert.equal(engine.state.currentRound, 2);
  assert.deepEqual(engine.state.misterXTravelLog.map(e => e.round), [1, 2]);
  assert.equal(engine.state.moveHistory[1].isDoubleMove, true, 'Second half is flagged as double move');
});

test('Double Move is rejected on the final round', () => {
  const engine = new GameEngine(LONDON_MAP);
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 2, maxRounds: 24 },
    { misterX: 1, detectives: [100, 101] }
  );
  engine.state.currentRound = 24;
  const res = engine.validateMove({
    playerRole: 'misterX',
    toStation: 8,
    ticketUsed: 'taxi',
    isDoubleMove: true
  });
  assert.equal(res.valid, false);
});

test('Direct capture mechanics', () => {
  const engine = new GameEngine(LONDON_MAP);
  // Station 1 connects to 8 (taxi) and 9 (taxi)
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 1, maxRounds: 24 },
    { misterX: 9, detectives: [8] }
  );

  // Mister X moves 9 -> 1 (taxi)
  const xMove = engine.executeMove({ playerRole: 'misterX', toStation: 1, ticketUsed: 'taxi' });
  assert.equal(xMove.valid, true);

  // Detective Red at 8 moves 8 -> 1 (taxi), landing on Mister X!
  const capMove = engine.executeMove({ playerRole: 'detective_red', toStation: 1, ticketUsed: 'taxi' });
  assert.equal(capMove.valid, true);
  assert.equal(engine.state.status, 'detectives_won');
  assert.equal(engine.state.winInfo?.winner, 'detectives');
  assert.equal(engine.state.winInfo?.reason, 'captured');
  assert.equal(engine.state.winInfo?.capturingDetective, 'detective_red');
});

test('Win condition: Mister X trapped with 0 legal moves', () => {
  const engine = new GameEngine(LONDON_MAP);
  // Station 8 connects to 1, 18, 19 (all taxi).
  // If Mister X is at 8, and detectives occupy 1, 18, 19, Mister X has NO legal moves!
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 3, maxRounds: 24 },
    { misterX: 8, detectives: [1, 18, 19] }
  );

  // In this setup, Mister X is completely surrounded by detectives on all 3 adjacent stations
  const legalXMoves = engine.getLegalMoves('misterX');
  assert.equal(legalXMoves.length, 0, 'Mister X should have 0 legal moves when surrounded');
});

test('Win condition: Round 24 exhaustion gives victory to Mister X', () => {
  const engine = new GameEngine(LONDON_MAP);
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 1, maxRounds: 24 },
    { misterX: 1, detectives: [199] }
  );

  // Manually fast-forward round to 24
  engine.state.currentRound = 24;
  engine.state.turnIndex = 1; // detective_red turn (last in turn order)
  engine.state.activeRole = 'detective_red';

  // Detective Red moves
  const moves = engine.getLegalMoves('detective_red');
  assert.ok(moves.length > 0);
  engine.executeMove(moves[0]);

  // Round increments to 25 -> exceeds maxRounds (24) -> Mister X wins!
  assert.equal(engine.state.status, 'mister_x_won');
  assert.equal(engine.state.winInfo?.winner, 'misterX');
  assert.equal(engine.state.winInfo?.reason, 'rounds_exhausted');
});

test('State sanitization hides Mister X station from detectives', () => {
  const engine = new GameEngine(LONDON_MAP);
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 2, maxRounds: 24 },
    { misterX: 1, detectives: [50, 60] }
  );

  // Mister X moves in round 1
  engine.executeMove({ playerRole: 'misterX', toStation: 8, ticketUsed: 'taxi' });

  const sanitized = engine.getSanitizedStateForDetectives();
  assert.equal(sanitized.players.misterX.station, -1, 'Mister X position must be masked');
  assert.equal(sanitized.moveHistory[0].toStation, -1, 'Move history toStation must be masked');
});
