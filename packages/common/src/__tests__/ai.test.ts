import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../engine/GameEngine.ts';
import { LONDON_MAP } from '../maps/london.ts';
import { MisterXAI } from '../ai/MisterXAI.ts';

test('MisterXAI selects legal and valid moves', () => {
  const engine = new GameEngine(LONDON_MAP);
  const ai = new MisterXAI(engine.graph);

  const decision = ai.selectMove(engine.state);
  assert.ok(decision, 'AI should produce a valid decision');
  assert.equal(decision.action.playerRole, 'misterX');

  // Verify the move is accepted by GameEngine
  const validation = engine.validateMove(decision.action);
  assert.equal(validation.valid, true, `Move should be legal: ${validation.error}`);
});

test('MisterXAI avoids stations occupied by detectives', () => {
  const engine = new GameEngine(LONDON_MAP);
  const ai = new MisterXAI(engine.graph);

  // Station 1 connects to 8 (taxi), 9 (taxi), 46 (underground, bus)
  // Place Mister X at 1, Detectives at 8 and 9
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 2, maxRounds: 24 },
    { misterX: 1, detectives: [8, 9] }
  );

  const decision = ai.selectMove(engine.state);
  assert.ok(decision);
  // AI MUST NOT move to 8 or 9
  assert.notEqual(decision.action.toStation, 8, 'AI must not move to detective at 8');
  assert.notEqual(decision.action.toStation, 9, 'AI must not move to detective at 9');

  // Node 46 is the remaining valid path (underground or bus)
  assert.equal(decision.action.toStation, 46);
});

test('MisterXAI increases distance when threatened', () => {
  const engine = new GameEngine(LONDON_MAP);
  const ai = new MisterXAI(engine.graph);

  // Station 46 connects to 1, 13, 74, 79 via underground
  // Place Mister X at 46, Detective at 1
  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 1, maxRounds: 24 },
    { misterX: 46, detectives: [1] }
  );

  const decision = ai.selectMove(engine.state);
  assert.ok(decision);

  // From 46, moving to 74, 79, or 13 increases distance from Detective at 1
  const distFromDet = engine.graph.getDistance(decision.action.toStation, 1);
  assert.ok(distFromDet >= 1, `AI should move away from detective: dist=${distFromDet}`);
});

test('MisterXAI can execute a full multi-turn simulation without errors', () => {
  const engine = new GameEngine(LONDON_MAP);
  const ai = new MisterXAI(engine.graph);

  engine.createNewGame(
    { cityId: 'london', difficulty: 'classic', detectiveCount: 4, maxRounds: 15 },
    { misterX: 35, detectives: [13, 26, 29, 34] }
  );

  let roundsPlayed = 0;
  while (engine.state.status === 'in_progress' && roundsPlayed < 12) {
    if (engine.state.activeRole === 'misterX') {
      const decision = ai.selectMove(engine.state);
      assert.ok(decision, 'AI must select a move for Mister X');

      const res = engine.executeMove(decision.action);
      assert.equal(res.valid, true, `Mister X move failed: ${res.error}`);

      if (decision.secondAction && engine.state.activeRole === 'misterX') {
        const res2 = engine.executeMove(decision.secondAction);
        assert.equal(res2.valid, true, `Mister X double move second step failed: ${res2.error}`);
      }
      roundsPlayed++;
    } else {
      // Detective move (pick any legal move)
      const moves = engine.getLegalMoves(engine.state.activeRole);
      if (moves.length > 0) {
        const res = engine.executeMove(moves[0]);
        assert.equal(res.valid, true, `Detective move failed: ${res.error}`);
      }
    }
  }

  assert.ok(roundsPlayed > 0, 'Simulation completed multiple rounds successfully');
});
