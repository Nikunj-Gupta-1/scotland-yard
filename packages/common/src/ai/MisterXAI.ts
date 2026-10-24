import type { Graph } from "../graph/Graph.ts";
import type {
  GameState,
  MoveAction,
  TicketInventory,
  TicketType
} from "../types/index.ts";

export interface AIDecision {
  action: MoveAction;
  secondAction?: MoveAction;
  reasoning: string;
  evaluatedScore: number;
}

export class MisterXAI {
  public readonly graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Computes the best move for Mister X in the current game state.
   */
  public selectMove(gameState: GameState): AIDecision | null {
    const misterX = gameState.players.misterX;
    if (!misterX || gameState.activeRole !== "misterX" || gameState.status !== "in_progress") {
      return null;
    }

    const currentStation = misterX.station;
    const tickets = misterX.tickets;

    // Identify active detective positions
    const detectiveStations: number[] = [];
    for (const role of gameState.turnOrder) {
      if (role !== "misterX") {
        const det = gameState.players[role];
        if (det && det.station > 0) {
          detectiveStations.push(det.station);
        }
      }
    }

    // Distance field from all active detectives to every node on the board
    const detectiveDistanceField = this.graph.getDistanceFieldFromMultiple(detectiveStations);
    const currentMinDetDist = detectiveDistanceField.get(currentStation) ?? 99;

    // Check if double-move is available and warranted (e.g. detective within <= 2 hops)
    const canDoubleMove =
      tickets.doubleMove > 0 &&
      !gameState.doubleMoveActive &&
      (currentMinDetDist <= 2 || gameState.currentRound === 3 || gameState.currentRound === 8);

    // If double-move is strategically viable, evaluate 2-step sequences
    if (canDoubleMove) {
      const bestDouble = this.evaluateDoubleMoves(gameState, detectiveStations, detectiveDistanceField);
      if (bestDouble && bestDouble.evaluatedScore > 150) {
        return bestDouble;
      }
    }

    // Standard single-move evaluation
    const reachable = this.graph.getReachableStations(currentStation, tickets, true);
    let bestDecision: AIDecision | null = null;
    let highestScore = -Infinity;

    const occupiedSet = new Set(detectiveStations);

    for (const r of reachable) {
      // Cannot move to a station occupied by a detective
      if (occupiedSet.has(r.stationId)) continue;

      const destNode = this.graph.getNode(r.stationId);
      if (!destNode) continue;

      // Evaluate score for destination station
      const score = this.evaluateStationSafety(
        r.stationId,
        detectiveStations,
        detectiveDistanceField,
        gameState.currentRound
      );

      // Choose best ticket for this edge
      const chosenTicket = this.chooseBestTicketForMove(
        currentStation,
        r.stationId,
        r.validTickets,
        tickets,
        currentMinDetDist,
        gameState.currentRound
      );

      if (score > highestScore) {
        highestScore = score;
        bestDecision = {
          action: {
            playerRole: "misterX",
            toStation: r.stationId,
            ticketUsed: chosenTicket
          },
          reasoning: `Station #${r.stationId} (safety score: ${score.toFixed(1)}, min dist: ${detectiveDistanceField.get(r.stationId) ?? '?'})`,
          evaluatedScore: score
        };
      }
    }

    return bestDecision;
  }

  /**
   * Evaluates the safety and strategic mobility score of a candidate station.
   */
  public evaluateStationSafety(
    stationId: number,
    detectiveStations: number[],
    distanceField: Map<number, number>,
    currentRound: number
  ): number {
    const node = this.graph.getNode(stationId);
    if (!node) return -Infinity;

    const minDetDist = distanceField.get(stationId) ?? 99;

    // Severe penalties for immediate capture danger
    if (minDetDist === 0) return -10000;
    if (minDetDist === 1) return -500;

    let score = 0;

    // 1. Distance scoring
    if (minDetDist >= 4) {
      score += 200 + minDetDist * 25;
    } else if (minDetDist === 3) {
      score += 120;
    } else if (minDetDist === 2) {
      score += 30;
    }

    // Average distance to all detectives
    let totalDist = 0;
    for (const detStation of detectiveStations) {
      totalDist += this.graph.getDistance(stationId, detStation);
    }
    const avgDist = detectiveStations.length > 0 ? totalDist / detectiveStations.length : 5;
    score += avgDist * 15;

    // 2. Mobility & Transit Hub Value
    const transports = node.transports;
    if (transports.includes("underground")) {
      score += 45; // High-speed escape leap
    }
    if (transports.includes("bus")) {
      score += 25;
    }
    if (transports.includes("ferry")) {
      score += 60; // River ferry is a game-changer because detectives cannot use it!
    }

    // Number of outgoing connections
    const outgoing = this.graph.getAdjacentNodes(stationId);
    score += outgoing.length * 6;

    // Cul-de-sac penalty (stations with only 1 or 2 exits)
    if (outgoing.length <= 2) {
      score -= 80;
    }

    // 3. Surfacing Round Positioning
    const surfacingRounds = this.graph.mapData.surfacingRounds;
    const isRoundBeforeSurfacing = surfacingRounds.includes(currentRound + 1);

    if (isRoundBeforeSurfacing) {
      // Prioritize being at a station with Underground or Ferry to escape the moment we surface!
      if (transports.includes("underground") || transports.includes("ferry")) {
        score += 50;
      }
    }

    return score;
  }

  /**
   * Decides which ticket type to spend for a chosen edge (Taxi vs Bus vs Tube vs Black Ticket).
   */
  private chooseBestTicketForMove(
    from: number,
    to: number,
    validTickets: TicketType[],
    inventory: TicketInventory,
    currentMinDist: number,
    round: number
  ): TicketType {
    const transports = this.graph.getTransportsBetween(from, to);

    // If it's a ferry route, Black ticket is mandatory
    if (transports.includes("ferry") && validTickets.includes("black")) {
      return "black";
    }

    // If detectives are close (min distance <= 2) and we have black tickets,
    // using a Black ticket creates high uncertainty about our transport mode!
    if (currentMinDist <= 2 && inventory.black > 0 && validTickets.includes("black")) {
      return "black";
    }

    // Prefer using standard transport tickets: Tube > Bus > Taxi to conserve flexible tickets
    if (validTickets.includes("underground") && inventory.underground > 0) {
      return "underground";
    }
    if (validTickets.includes("bus") && inventory.bus > 0) {
      return "bus";
    }
    if (validTickets.includes("taxi") && inventory.taxi > 0) {
      return "taxi";
    }
    if (validTickets.includes("black") && inventory.black > 0) {
      return "black";
    }

    return validTickets[0] || "taxi";
  }

  /**
   * Evaluates all possible 2-step moves for a Double Move (2x) sequence.
   */
  private evaluateDoubleMoves(
    gameState: GameState,
    detectiveStations: number[],
    distanceField: Map<number, number>
  ): AIDecision | null {
    const misterX = gameState.players.misterX;
    const currentStation = misterX.station;
    const tickets = misterX.tickets;
    const occupiedSet = new Set(detectiveStations);

    // Step 1: Reachable stations from current station
    const step1Reachable = this.graph.getReachableStations(currentStation, tickets, true);
    let bestDouble: AIDecision | null = null;
    let highestDoubleScore = -Infinity;

    for (const r1 of step1Reachable) {
      if (occupiedSet.has(r1.stationId)) continue;

      // Simulate tickets after step 1
      const ticket1 = r1.validTickets[0];
      const remainingTickets = { ...tickets, [ticket1]: Math.max(0, tickets[ticket1] - 1) };

      // Step 2: Reachable stations from r1.stationId
      const step2Reachable = this.graph.getReachableStations(r1.stationId, remainingTickets, true);

      for (const r2 of step2Reachable) {
        if (occupiedSet.has(r2.stationId)) continue;
        if (r2.stationId === currentStation) continue; // Avoid immediately backtracking on a double move

        const score = this.evaluateStationSafety(
          r2.stationId,
          detectiveStations,
          distanceField,
          gameState.currentRound
        );

        if (score > highestDoubleScore) {
          highestDoubleScore = score;
          bestDouble = {
            action: {
              playerRole: "misterX",
              toStation: r1.stationId,
              ticketUsed: ticket1,
              isDoubleMove: true
            },
            secondAction: {
              playerRole: "misterX",
              toStation: r2.stationId,
              ticketUsed: r2.validTickets[0]
            },
            reasoning: `Double Move: #${currentStation} -> #${r1.stationId} -> #${r2.stationId} (score: ${score.toFixed(1)})`,
            evaluatedScore: score
          };
        }
      }
    }

    return bestDouble;
  }
}
