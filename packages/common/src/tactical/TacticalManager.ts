import type { Graph } from "../graph/Graph.ts";
import type {
  GameState,
  PlayerRole,
  RadarPingResult,
  Roadblock,
  TacticalState,
  ValidationResult
} from "../types/index.ts";

export class TacticalManager {
  /**
   * Initializes tactical state according to difficulty level.
   */
  public static createInitialState(difficulty: 'casual' | 'classic' | 'hard'): TacticalState {
    switch (difficulty) {
      case 'casual':
        return {
          roadblocks: [],
          detectiveRoadblocksRemaining: 3,
          detectiveRadarPingsRemaining: 3,
          misterXDecoysRemaining: 1,
          activeDecoyNextMove: false
        };
      case 'hard':
        return {
          roadblocks: [],
          detectiveRoadblocksRemaining: 1,
          detectiveRadarPingsRemaining: 1,
          misterXDecoysRemaining: 3,
          activeDecoyNextMove: false
        };
      case 'classic':
      default:
        return {
          roadblocks: [],
          detectiveRoadblocksRemaining: 2,
          detectiveRadarPingsRemaining: 2,
          misterXDecoysRemaining: 2,
          activeDecoyNextMove: false
        };
    }
  }

  /**
   * Checks if a station is currently blocked by a police barrier.
   */
  public static isStationBlocked(stationId: number, state: GameState): boolean {
    if (!state.tacticalState) return false;
    return state.tacticalState.roadblocks.some(r => r.stationId === stationId && r.roundsRemaining > 0);
  }

  /**
   * Deploys a police roadblock on a station.
   */
  public static deployRoadblock(
    stationId: number,
    byRole: PlayerRole,
    state: GameState,
    graph: Graph
  ): ValidationResult {
    if (!state.config.tacticalMode || !state.tacticalState) {
      return { valid: false, error: 'Tactical mode is not enabled in this match.' };
    }
    if (byRole === 'misterX') {
      return { valid: false, error: 'Only detectives can deploy police roadblocks.' };
    }
    if (state.tacticalState.detectiveRoadblocksRemaining <= 0) {
      return { valid: false, error: 'No detective roadblocks remaining.' };
    }
    if (!graph.getNode(stationId)) {
      return { valid: false, error: `Station ${stationId} does not exist.` };
    }
    if (this.isStationBlocked(stationId, state)) {
      return { valid: false, error: `Station ${stationId} already has an active roadblock.` };
    }

    // Add roadblock
    const roadblock: Roadblock = {
      stationId,
      placedByRole: byRole,
      roundsRemaining: 2 // Lasts for 2 rounds
    };
    state.tacticalState.roadblocks.push(roadblock);
    state.tacticalState.detectiveRoadblocksRemaining--;

    return { valid: true };
  }

  /**
   * Performs an informant radar ping on a station to detect if Mister X is within a 2-hop radius.
   */
  public static executeRadarPing(
    targetStationId: number,
    byRole: PlayerRole,
    state: GameState,
    graph: Graph
  ): { result: RadarPingResult | null; error?: string } {
    if (!state.config.tacticalMode || !state.tacticalState) {
      return { result: null, error: 'Tactical mode is not enabled.' };
    }
    if (byRole === 'misterX') {
      return { result: null, error: 'Only detectives can execute radar pings.' };
    }
    if (state.tacticalState.detectiveRadarPingsRemaining <= 0) {
      return { result: null, error: 'No radar pings remaining.' };
    }
    if (!graph.getNode(targetStationId)) {
      return { result: null, error: `Station ${targetStationId} does not exist.` };
    }

    const misterX = state.players.misterX;
    if (!misterX) {
      return { result: null, error: 'Mister X not found.' };
    }

    // Calculate actual hop distance between target station and Mister X
    const actualDistance = graph.getDistance(targetStationId, misterX.station);
    const detected = actualDistance <= 2; // Detected if within 2 hops!

    state.tacticalState.detectiveRadarPingsRemaining--;

    return {
      result: {
        stationId: targetStationId,
        detected,
        actualDistance
      }
    };
  }

  /**
   * Activates Mister X Decoy / Phantom Ticket on their next move.
   */
  public static activateDecoy(state: GameState): ValidationResult {
    if (!state.config.tacticalMode || !state.tacticalState) {
      return { valid: false, error: 'Tactical mode is not enabled.' };
    }
    if (state.activeRole !== 'misterX') {
      return { valid: false, error: 'Only Mister X can activate decoy tickets.' };
    }
    if (state.tacticalState.misterXDecoysRemaining <= 0) {
      return { valid: false, error: 'No decoys remaining.' };
    }

    state.tacticalState.activeDecoyNextMove = true;
    state.tacticalState.misterXDecoysRemaining--;
    return { valid: true };
  }

  /**
   * Called on round transitions to decay active roadblocks.
   */
  public static onRoundEnd(state: GameState): void {
    if (!state.tacticalState) return;

    // Decrement roundsRemaining and clean up expired
    state.tacticalState.roadblocks = state.tacticalState.roadblocks
      .map(r => ({ ...r, roundsRemaining: r.roundsRemaining - 1 }))
      .filter(r => r.roundsRemaining > 0);
  }
}
