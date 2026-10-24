import { GameEngine, getMapById } from "@scotland-yard/common";
import type { GameState, MoveAction, PlayerRole } from "@scotland-yard/common";
import type { LocalMatchSetup } from "../components/screens/GameSetupScreen";

export type GameMode = "single_player" | "pass_and_play" | "multiplayer";
export type Difficulty = "casual" | "classic" | "hard";
export type Screen = "title" | "setup" | "game";

/** Builds a freshly created, randomised local engine (hotseat / single-player). */
export function createLocalEngine(
  cityId: string,
  difficulty: Difficulty,
  tacticalMode: boolean
): GameEngine {
  const engine = new GameEngine(getMapById(cityId));
  engine.createNewGame({
    cityId,
    difficulty,
    detectiveCount: 5,
    maxRounds: 24,
    tacticalMode
  });
  engine.randomizeStartPositions();
  return engine;
}

/** Applies customised player names from the setup screen onto the engine state. */
export function applyPlayerNames(engine: GameEngine, setup: LocalMatchSetup): void {
  Object.entries(setup.roleAssignments).forEach(([role, playerIdx]) => {
    if (playerIdx >= 0 && setup.playerNames[playerIdx]) {
      const roleKey = role as PlayerRole;
      if (engine.state.players[roleKey]) {
        engine.state.players[roleKey].name = setup.playerNames[playerIdx];
      }
    }
  });
}

/** Simple detective bot: chase the last surfaced position, else maximise mobility. */
export function chooseDetectiveBotMove(engine: GameEngine, role: PlayerRole): MoveAction | null {
  const legalMoves = engine.getLegalMoves(role);
  if (legalMoves.length === 0) return null;

  const lastSurfaced = [...engine.state.moveHistory]
    .reverse()
    .find((m) => m.playerRole === "misterX" && m.surfaced && m.toStation > 0);

  let chosenMove = legalMoves[0];
  if (lastSurfaced) {
    let bestDist = 999;
    for (const move of legalMoves) {
      const d = engine.graph.getDistance(move.toStation, lastSurfaced.toStation);
      if (d < bestDist) {
        bestDist = d;
        chosenMove = move;
      }
    }
  } else {
    let bestDeg = -1;
    for (const move of legalMoves) {
      const deg = engine.graph.getAdjacentNodes(move.toStation).length;
      if (deg > bestDeg) {
        bestDeg = deg;
        chosenMove = move;
      }
    }
  }
  return chosenMove;
}

/** Rounds in which a detective ended a move adjacent to Mister X. */
export function countNearMisses(engine: GameEngine): number {
  let count = 0;
  const history = engine.state.moveHistory;
  const xMoves = history.filter((m) => m.playerRole === "misterX");
  for (const xm of xMoves) {
    const detMovesInRound = history.filter(
      (m) => m.round === xm.round && m.playerRole !== "misterX"
    );
    for (const dm of detMovesInRound) {
      if (engine.graph.getDistance(xm.toStation, dm.toStation) === 1) {
        count++;
        break;
      }
    }
  }
  return count;
}

/**
 * State rendered on the canvas: hide Mister X if a detective view is active AND
 * the game is in progress (Zero-Leak). Multiplayer states are already sanitized by the server.
 */
export function getDisplayState(args: {
  engine: GameEngine;
  gameState: GameState;
  gameMode: GameMode;
  activeRole: PlayerRole;
  localSetup: LocalMatchSetup | null;
  isReplayActive: boolean;
}): GameState {
  const { engine, gameState, gameMode, activeRole, localSetup, isReplayActive } = args;
  if (isReplayActive) return gameState;
  if (gameMode === "multiplayer") return gameState;

  const isLocalMisterXTurn =
    localSetup?.gameMode === "play_as_x" ||
    (localSetup?.gameMode === "pass_and_play" && activeRole === "misterX");
  if (isLocalMisterXTurn) return gameState;

  if (gameState.status === "in_progress") {
    return engine.getSanitizedStateForDetectives();
  }
  return gameState;
}

/** Which perspective the ticket HUD should render for. */
export function getViewerRole(args: {
  gameMode: GameMode;
  activeRole: PlayerRole;
  localSetup: LocalMatchSetup | null;
  myRole: PlayerRole | "spectator" | null;
  myRoles: PlayerRole[];
}): PlayerRole | "spectator" | "detectives" {
  const { gameMode, activeRole, localSetup, myRole, myRoles } = args;
  if (gameMode === "multiplayer") {
    return myRole || (myRoles && myRoles.length > 0 ? myRoles[0] : "spectator");
  }
  if (localSetup?.gameMode === "play_as_x") {
    return activeRole === "misterX" ? "misterX" : "detectives";
  }
  if (localSetup?.gameMode === "pass_and_play") return activeRole;
  return "detectives";
}
