import type { GameEngine, GameState, PlayerRole } from "@scotland-yard/common";

export class StateSanitizer {
  /**
   * Generates a safe GameState payload tailored for the recipient's role.
   *
   * Security / Anti-Cheat rules:
   * 1. If recipient is 'misterX', full GameState is transmitted.
   * 2. If recipient is a detective or spectator:
   *    - Mister X's actual station is redacted (-1) UNLESS:
   *      a) The match is over (detectives won or Mister X won), OR
   *      b) It is currently a surfacing round AND Mister X has taken his turn this round.
   *    - Mister X's moveHistory hidden station coordinates (fromStation, toStation) are redacted (-1).
   *    - Any pending decoy activation is hidden to prevent detectives sniffing network traffic.
   */
  public static sanitize(
    engine: GameEngine,
    recipientRole: PlayerRole | "spectator"
  ): GameState {
    const rawState = engine.state;

    if (recipientRole === "misterX") {
      // Mister X sees everything
      return JSON.parse(JSON.stringify(rawState)) as GameState;
    }

    // For detectives and spectators, use engine's sanitized state
    const sanitized = engine.getSanitizedStateForDetectives();

    // Extra safeguard for tactical decoy state
    if (sanitized.tacticalState) {
      sanitized.tacticalState = {
        ...sanitized.tacticalState,
        activeDecoyNextMove: false
      };
    }

    return sanitized;
  }
}
