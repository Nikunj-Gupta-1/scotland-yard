import {
  GameEngine,
  getMapById,
  TacticalManager,
  MisterXAI
} from "@scotland-yard/common";
import type {
  GameConfig,
  GameState,
  MoveAction,
  PlayerRole,
  RadarPingResult,
  ValidationResult
} from "@scotland-yard/common";
import { StateSanitizer } from "../security/StateSanitizer.ts";

export interface SessionCallbacks {
  onStateUpdate: () => void;
  onTimerTick?: (secondsLeft: number) => void;
  onChatMessage?: (sender: string, text: string, channel: "all" | "detectives") => void;
  onGameOver?: (winner: "detectives" | "misterX") => void;
}

export class GameSessionController {
  public engine: GameEngine;
  public roomCode: string;
  public roleAssignments: Map<PlayerRole, string>; // role -> socketId
  public botRoles: Set<PlayerRole>;
  public callbacks: SessionCallbacks;

  private turnTimerInterval?: NodeJS.Timeout;
  private secondsRemaining: number = 0;
  private isDestroyed: boolean = false;

  constructor(
    roomCode: string,
    config: GameConfig,
    roleAssignments: Map<PlayerRole, string>,
    playerNames: Map<string, string>,
    callbacks: SessionCallbacks
  ) {
    this.roomCode = roomCode;
    this.roleAssignments = new Map(roleAssignments);
    this.botRoles = new Set();
    this.callbacks = callbacks;

    const mapData = getMapById(config.cityId || "london");
    this.engine = new GameEngine(mapData);
    this.engine.createNewGame(config);
    this.engine.randomizeStartPositions();

    // Map player names & mark unassigned roles as bots
    for (const role of this.engine.state.turnOrder) {
      const socketId = this.roleAssignments.get(role);
      if (socketId && playerNames.has(socketId)) {
        this.engine.state.players[role].name = playerNames.get(socketId)!;
        this.engine.state.players[role].isAI = false;
      } else {
        this.botRoles.add(role);
        this.engine.state.players[role].name = `Bot (${role.replace("detective_", "").toUpperCase()})`;
        this.engine.state.players[role].isAI = true;
      }
    }
  }

  public start(): void {
    this.startTurnTimer();
    this.checkAutoPlayBot();
  }

  public getSanitizedState(recipientRole: PlayerRole | "spectator"): GameState {
    return StateSanitizer.sanitize(this.engine, recipientRole);
  }

  /**
   * Authoritative viewer role for a socket, derived solely from the session's
   * own frozen role assignments (never from mutable lobby state).
   */
  public getViewerRole(socketId: string): PlayerRole | "spectator" {
    if (this.roleAssignments.get("misterX") === socketId && !this.botRoles.has("misterX")) {
      return "misterX";
    }
    for (const [role, sId] of this.roleAssignments) {
      if (sId === socketId && role !== "misterX" && !this.botRoles.has(role)) return role;
    }
    return "spectator";
  }

  /**
   * Re-points every role held by `oldSocketId` to `newSocketId` (session resume).
   */
  public rebindSocket(oldSocketId: string, newSocketId: string): void {
    for (const [role, sId] of Array.from(this.roleAssignments.entries())) {
      if (sId === oldSocketId) this.roleAssignments.set(role, newSocketId);
    }
  }

  /**
   * Converts every role held by a disconnected socket into a bot so the match continues.
   */
  public releaseSocket(socketId: string): void {
    if (this.isDestroyed) return;
    for (const [role, sId] of Array.from(this.roleAssignments.entries())) {
      if (sId !== socketId) continue;
      this.roleAssignments.delete(role);
      this.botRoles.add(role);
      const label = role === "misterX" ? "MISTER X" : role.replace("detective_", "").toUpperCase();
      this.engine.state.players[role].name = `Bot (${label})`;
      this.engine.state.players[role].isAI = true;
    }
    if (this.engine.state.status === "in_progress") {
      this.callbacks.onStateUpdate();
      this.checkAutoPlayBot();
    }
  }

  public executeMove(
    socketId: string,
    action: MoveAction
  ): ValidationResult {
    if (this.isDestroyed) {
      return { valid: false, error: "Game session ended." };
    }

    const activeRole = this.engine.state.activeRole;
    const assignedSocket = this.roleAssignments.get(activeRole);

    if (assignedSocket !== socketId) {
      return { valid: false, error: `It is not your turn (${activeRole}).` };
    }

    if (action.playerRole !== activeRole) {
      return { valid: false, error: `Mismatched player role action.` };
    }

    const result = this.engine.executeMove(action);
    if (!result.valid) {
      return result;
    }

    this.onMoveComplete();
    return { valid: true };
  }

  public deployRoadblock(socketId: string, stationId: number): ValidationResult {
    const activeRole = this.engine.state.activeRole;
    if (this.roleAssignments.get(activeRole) !== socketId) {
      return { valid: false, error: "Only active player can deploy roadblocks." };
    }

    const res = TacticalManager.deployRoadblock(
      stationId,
      activeRole,
      this.engine.state,
      this.engine.graph
    );

    if (res.valid) {
      this.callbacks.onStateUpdate();
    }
    return res;
  }

  public executeRadarPing(
    socketId: string,
    stationId: number
  ): { result: RadarPingResult | null; error?: string } {
    const activeRole = this.engine.state.activeRole;
    if (this.roleAssignments.get(activeRole) !== socketId) {
      return { result: null, error: "Only active player can ping radar." };
    }

    const res = TacticalManager.executeRadarPing(
      stationId,
      activeRole,
      this.engine.state,
      this.engine.graph
    );

    if (res.result) {
      this.callbacks.onStateUpdate();
    }
    return res;
  }

  public activateDecoy(socketId: string): ValidationResult {
    const activeRole = this.engine.state.activeRole;
    if (activeRole !== "misterX" || this.roleAssignments.get("misterX") !== socketId) {
      return { valid: false, error: "Only Mister X can activate decoys." };
    }

    const res = TacticalManager.activateDecoy(this.engine.state);
    if (res.valid) {
      this.callbacks.onStateUpdate();
    }
    return res;
  }

  private onMoveComplete(): void {
    this.resetTurnTimer();
    this.callbacks.onStateUpdate();

    if (this.engine.state.status !== "in_progress") {
      this.clearTurnTimer();
      const winner = this.engine.state.status === "detectives_won" ? "detectives" : "misterX";
      this.callbacks.onGameOver?.(winner);
      return;
    }

    this.checkAutoPlayBot();
  }

  private checkAutoPlayBot(): void {
    if (this.isDestroyed || this.engine.state.status !== "in_progress") return;

    const activeRole = this.engine.state.activeRole;
    if (this.botRoles.has(activeRole)) {
      // Small delay to simulate thinking and allow UI animations
      setTimeout(() => {
        if (this.isDestroyed || this.engine.state.activeRole !== activeRole) return;
        this.executeBotTurn(activeRole);
      }, 600);
    }
  }

  private executeBotTurn(role: PlayerRole): void {
    if (role === "misterX") {
      const ai = new MisterXAI(this.engine.graph);
      const decision = ai.selectMove(this.engine.state);
      if (decision) {
        this.engine.executeMove(decision.action);
        if (decision.secondAction && this.engine.state.doubleMoveActive) {
          this.engine.executeMove(decision.secondAction);
        }
      }
    } else {
      // Detective bot strategy: move toward last known Mister X station if available
      const legalMoves = this.engine.getLegalMoves(role);
      if (legalMoves.length > 0) {
        const lastKnownStation = this.getLastKnownMisterXStation();
        let chosenMove = legalMoves[0];

        if (lastKnownStation !== null) {
          let minDistance = Infinity;
          for (const move of legalMoves) {
            const hops = this.engine.graph.getDistance(move.toStation, lastKnownStation);
            const dist = Number.isFinite(hops) ? hops : 99;
            if (dist < minDistance) {
              minDistance = dist;
              chosenMove = move;
            }
          }
        } else {
          // Pick a random legal move
          chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }

        this.engine.executeMove({
          playerRole: role,
          toStation: chosenMove.toStation,
          ticketUsed: chosenMove.ticketUsed
        });
      }
    }

    this.onMoveComplete();
  }

  private getLastKnownMisterXStation(): number | null {
    const travelLog = this.engine.state.misterXTravelLog;
    for (let i = travelLog.length - 1; i >= 0; i--) {
      if (travelLog[i].revealedStation !== undefined) {
        return travelLog[i].revealedStation!;
      }
    }
    return null;
  }

  private startTurnTimer(): void {
    const timeLimit = this.engine.state.config.turnTimeLimitSeconds || 0;
    if (timeLimit <= 0) return;

    this.secondsRemaining = timeLimit;
    this.turnTimerInterval = setInterval(() => {
      this.secondsRemaining--;
      this.callbacks.onTimerTick?.(this.secondsRemaining);

      if (this.secondsRemaining <= 0) {
        this.handleTurnTimeout();
      }
    }, 1000);
  }

  private resetTurnTimer(): void {
    this.clearTurnTimer();
    this.startTurnTimer();
  }

  private clearTurnTimer(): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = undefined;
    }
  }

  private handleTurnTimeout(): void {
    this.clearTurnTimer();
    const activeRole = this.engine.state.activeRole;
    // Auto-play move on timeout
    this.executeBotTurn(activeRole);
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.clearTurnTimer();
  }
}
