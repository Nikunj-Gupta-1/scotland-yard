import { Graph } from "../graph/Graph.ts";
import { TacticalManager } from "../tactical/TacticalManager.ts";
import type {
  CityMapData,
  DetectiveRole,
  GameConfig,
  GameState,
  MoveAction,
  MoveRecord,
  PlayerRole,
  PlayerState,
  TicketInventory,
  TicketType,
  ValidationResult,
  WinInfo
} from "../types/index.ts";

export const ALL_DETECTIVE_ROLES: DetectiveRole[] = [
  'detective_red',
  'detective_green',
  'detective_yellow',
  'detective_blue',
  'detective_purple'
];

export class GameEngine {
  public state: GameState;
  public readonly graph: Graph;

  constructor(graphOrMap: Graph | CityMapData, initialState?: GameState) {
    if (graphOrMap instanceof Graph) {
      this.graph = graphOrMap;
    } else {
      this.graph = new Graph(graphOrMap);
    }

    if (initialState) {
      this.state = JSON.parse(JSON.stringify(initialState));
    } else {
      this.state = this.createNewGame({
        cityId: this.graph.mapData.id,
        difficulty: 'classic',
        detectiveCount: 5,
        maxRounds: 24
      });
    }
  }

  /**
   * Initializes a fresh game state according to official Scotland Yard rules.
   */
  public createNewGame(config: GameConfig, customStartStations?: { misterX: number; detectives: number[] }): GameState {
    const activeDetectives = ALL_DETECTIVE_ROLES.slice(0, Math.min(config.detectiveCount, 5));
    const turnOrder: PlayerRole[] = ['misterX', ...activeDetectives];

    // Pick start stations
    let startX: number;
    let startDetectives: number[] = [];

    if (customStartStations) {
      startX = customStartStations.misterX;
      startDetectives = customStartStations.detectives;
    } else {
      // Deterministic default starting positions to ensure SSR and initial client hydration match
      const availX = this.graph.mapData.startPositions.misterX;
      startX = availX[0] || 35;

      const availDet = this.graph.mapData.startPositions.detectives;
      startDetectives = availDet.slice(0, activeDetectives.length);
    }

    // Default authentic ticket distributions
    const detectiveTickets: TicketInventory = {
      taxi: 10,
      bus: 8,
      underground: 4,
      black: 0,
      doubleMove: 0
    };

    // Mister X starting tickets
    const misterXTickets: TicketInventory = {
      taxi: 4,
      bus: 3,
      underground: 3,
      black: activeDetectives.length, // Typically equal to number of detectives
      doubleMove: 2
    };

    const players: Record<PlayerRole, PlayerState> = {
      misterX: {
        id: 'player_mister_x',
        role: 'misterX',
        name: 'Mister X',
        isAI: false,
        station: startX,
        tickets: { ...misterXTickets }
      }
    } as any;

    activeDetectives.forEach((role, idx) => {
      const formattedName = role.replace('detective_', '').toUpperCase();
      players[role] = {
        id: `player_${role}`,
        role,
        name: `Detective ${formattedName}`,
        isAI: false,
        station: startDetectives[idx],
        tickets: { ...detectiveTickets }
      };
    });

    const state: GameState = {
      gameId: 'game_session',
      config,
      status: 'in_progress',
      currentRound: 1,
      activeRole: 'misterX',
      turnOrder,
      turnIndex: 0,
      players,
      misterXTravelLog: [],
      moveHistory: [],
      doubleMoveActive: false,
      tacticalState: config.tacticalMode
        ? TacticalManager.createInitialState(config.difficulty)
        : undefined
    };

    this.state = state;
    return state;
  }

  /**
   * Randomizes starting positions for a new match session (called on client after mount).
   */
  public randomizeStartPositions(): void {
    const availX = [...this.graph.mapData.startPositions.misterX];
    const startX = availX[Math.floor(Math.random() * availX.length)] || 35;

    const availDet = [...this.graph.mapData.startPositions.detectives];
    for (let i = availDet.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availDet[i], availDet[j]] = [availDet[j], availDet[i]];
    }

    if (this.state.players.misterX) {
      this.state.players.misterX.station = startX;
    }

    const activeDetectives = this.state.turnOrder.filter(r => r !== 'misterX');
    activeDetectives.forEach((role, idx) => {
      if (this.state.players[role]) {
        this.state.players[role].station = availDet[idx] || 13;
      }
    });
  }

  /**
   * Validates whether a move action is strictly legal according to Scotland Yard rules.
   */
  public validateMove(action: MoveAction): ValidationResult {
    if (this.state.status !== 'in_progress') {
      return { valid: false, error: 'Game is not in progress.' };
    }

    if (action.playerRole !== this.state.activeRole) {
      return {
        valid: false,
        error: `It is not ${action.playerRole}'s turn. Active player is ${this.state.activeRole}.`
      };
    }

    const player = this.state.players[action.playerRole];
    if (!player) {
      return { valid: false, error: 'Player role not found.' };
    }

    const currentStation = player.station;
    const destStation = action.toStation;

    // Destination must exist in graph
    if (!this.graph.getNode(destStation)) {
      return { valid: false, error: `Station ${destStation} does not exist.` };
    }

    // Must have available ticket
    if (player.tickets[action.ticketUsed] <= 0) {
      return { valid: false, error: `No ${action.ticketUsed} tickets remaining.` };
    }

    // Double move validation
    if (action.isDoubleMove) {
      if (action.playerRole !== 'misterX') {
        return { valid: false, error: 'Only Mister X can use double move tickets.' };
      }
      if (player.tickets.doubleMove <= 0 && !this.state.doubleMoveActive) {
        return { valid: false, error: 'No double-move tickets remaining.' };
      }
      // A double move consumes two rounds, so a second round must still exist.
      if (!this.state.doubleMoveActive && this.state.currentRound + 1 > this.state.config.maxRounds) {
        return { valid: false, error: 'Cannot use a double move on the final round.' };
      }
    }

    // Connection validation
    const availableTransports = this.graph.getTransportsBetween(currentStation, destStation);
    if (availableTransports.length === 0) {
      return {
        valid: false,
        error: `No route exists between station ${currentStation} and ${destStation}.`
      };
    }

    if (action.ticketUsed === 'black') {
      if (action.playerRole !== 'misterX') {
        return { valid: false, error: 'Only Mister X can use black tickets.' };
      }
      // Black tickets can be used on ANY transport (including ferry)
    } else {
      // For standard tickets, transport mode on the edge must match the ticket used
      if (action.ticketUsed === 'doubleMove') {
        return { valid: false, error: 'Cannot travel directly using doubleMove ticket; use transport ticket.' };
      }
      if (!availableTransports.includes(action.ticketUsed)) {
        return {
          valid: false,
          error: `No ${action.ticketUsed} route connects ${currentStation} to ${destStation}. Available: ${availableTransports.join(', ')}.`
        };
      }
    }

    // Roadblock barrier validation
    if (TacticalManager.isStationBlocked(destStation, this.state)) {
      return {
        valid: false,
        error: `Station ${destStation} is blocked by a police barrier.`
      };
    }

    // Collision rules:
    // Detectives cannot move to a station occupied by another detective
    if (action.playerRole !== 'misterX') {
      for (const role of this.state.turnOrder) {
        if (role !== 'misterX' && role !== action.playerRole) {
          if (this.state.players[role]?.station === destStation) {
            return {
              valid: false,
              error: `Station ${destStation} is already occupied by ${this.state.players[role].name}.`
            };
          }
        }
      }
    } else {
      // Mister X cannot move directly into a station occupied by any detective
      for (const role of this.state.turnOrder) {
        if (role !== 'misterX') {
          if (this.state.players[role]?.station === destStation) {
            return {
              valid: false,
              error: `Station ${destStation} is occupied by detective ${this.state.players[role].name}.`
            };
          }
        }
      }
    }

    return { valid: true };
  }

  /**
   * Returns all legal moves for a given player role.
   */
  public getLegalMoves(role: PlayerRole): MoveAction[] {
    const player = this.state.players[role];
    if (!player) return [];

    const isMisterX = role === 'misterX';
    const reachable = this.graph.getReachableStations(player.station, player.tickets, isMisterX);
    const moves: MoveAction[] = [];

    // Occupied detective stations to avoid
    const detectiveStations = new Set<number>();
    for (const r of this.state.turnOrder) {
      if (r !== 'misterX' && r !== role) {
        detectiveStations.add(this.state.players[r].station);
      }
    }

    for (const r of reachable) {
      // Cannot move to station blocked by police roadblock
      if (TacticalManager.isStationBlocked(r.stationId, this.state)) {
        continue;
      }

      // Neither detectives nor Mister X can move to a station occupied by another detective
      if (detectiveStations.has(r.stationId)) {
        continue;
      }

      for (const ticket of r.validTickets) {
        moves.push({
          playerRole: role,
          toStation: r.stationId,
          ticketUsed: ticket
        });
      }
    }

    return moves;
  }

  /**
   * Executes a move action, updates ticket ledger, records travel logs, and checks win conditions.
   */
  public executeMove(action: MoveAction): ValidationResult {
    const validation = this.validateMove(action);
    if (!validation.valid) {
      return validation;
    }

    const player = this.state.players[action.playerRole];
    const prevStation = player.station;

    // Handle double-move ticket consumption if starting a double-move sequence
    if (action.isDoubleMove && !this.state.doubleMoveActive) {
      player.tickets.doubleMove--;
      this.state.doubleMoveActive = true;
    }

    // Deduct ticket
    player.tickets[action.ticketUsed]--;

    // Detective tickets transfer to Mister X!
    if (action.playerRole !== 'misterX') {
      const misterX = this.state.players.misterX;
      if (misterX && (action.ticketUsed === 'taxi' || action.ticketUsed === 'bus' || action.ticketUsed === 'underground')) {
        misterX.tickets[action.ticketUsed]++;
      }
    }

    // Update station
    player.station = action.toStation;

    // Check if this round surfaces Mister X
    const isSurfacingRound = this.graph.mapData.surfacingRounds.includes(this.state.currentRound);

    // Record in move history
    const moveRecord: MoveRecord = {
      round: this.state.currentRound,
      playerRole: action.playerRole,
      fromStation: prevStation,
      toStation: action.toStation,
      ticketUsed: action.ticketUsed,
      surfaced: action.playerRole === 'misterX' && isSurfacingRound,
      timestamp: Date.now(),
      isDoubleMove: action.isDoubleMove || this.state.doubleMoveActive || this.state.doubleMoveSecondHalf
    };
    if (action.playerRole === 'misterX') {
      this.state.doubleMoveSecondHalf = false;
    }
    this.state.moveHistory.push(moveRecord);

    // If Mister X moved, record into travel log
    if (action.playerRole === 'misterX') {
      let loggedTicket = action.ticketUsed;
      if (this.state.tacticalState?.activeDecoyNextMove) {
        // Disguise ticket in public travel log
        loggedTicket = action.ticketUsed === 'taxi' ? 'bus' : 'taxi';
        this.state.tacticalState.activeDecoyNextMove = false;
      }

      this.state.misterXTravelLog.push({
        round: this.state.currentRound,
        ticketUsed: loggedTicket,
        revealedStation: isSurfacingRound ? action.toStation : undefined,
        isDoubleMoveFirstHalf: this.state.doubleMoveActive
      });
    }

    // Evaluate Win / Loss Conditions
    const winInfo = this.checkWinConditions(action);
    if (winInfo) {
      this.state.status = winInfo.winner === 'detectives' ? 'detectives_won' : 'mister_x_won';
      this.state.winInfo = winInfo;
      return { valid: true };
    }

    // Advance Turn
    this.advanceTurn();

    return { valid: true };
  }

  /**
   * Advances the turn index and round tracker.
   */
  private advanceTurn(): void {
    // If Mister X is currently executing the first move of a double move, keep activeRole as misterX
    if (this.state.activeRole === 'misterX' && this.state.doubleMoveActive) {
      // First move of double-move complete, second move is up next
      this.state.doubleMoveActive = false;
      this.state.doubleMoveSecondHalf = true;
      // Each half of a double move consumes its own round (official rules).
      this.state.currentRound++;
      return;
    }

    const nextTurnIndex = (this.state.turnIndex + 1) % this.state.turnOrder.length;

    // Check if round has ended (wrapped back to index 0, which is Mister X)
    if (nextTurnIndex === 0) {
      this.state.currentRound++;
      TacticalManager.onRoundEnd(this.state);

      // Check max rounds win condition
      if (this.state.currentRound > this.state.config.maxRounds) {
        this.state.status = 'mister_x_won';
        this.state.winInfo = {
          winner: 'misterX',
          reason: 'rounds_exhausted',
          finalRound: this.state.config.maxRounds
        };
        return;
      }
    }

    this.state.turnIndex = nextTurnIndex;
    this.state.activeRole = this.state.turnOrder[nextTurnIndex];

    // If the next active detective has no legal moves, auto-skip their turn
    if (this.state.activeRole !== 'misterX') {
      const legalMoves = this.getLegalMoves(this.state.activeRole);
      if (legalMoves.length === 0) {
        // Detective cannot move, skip to next player
        this.advanceTurn();
      }
    } else {
      // If it's Mister X's turn, verify Mister X has at least one legal move!
      const misterXMoves = this.getLegalMoves('misterX');
      if (misterXMoves.length === 0) {
        this.state.status = 'detectives_won';
        this.state.winInfo = {
          winner: 'detectives',
          reason: 'mister_x_trapped',
          finalRound: this.state.currentRound
        };
      }
    }
  }

  /**
   * Evaluates if any win condition has been triggered.
   */
  private checkWinConditions(lastAction: MoveAction): WinInfo | null {
    const misterX = this.state.players.misterX;
    if (!misterX) return null;

    // 1. Capture: Did a detective land on Mister X's station?
    if (lastAction.playerRole !== 'misterX') {
      const detective = this.state.players[lastAction.playerRole];
      if (detective && detective.station === misterX.station) {
        return {
          winner: 'detectives',
          reason: 'captured',
          capturingDetective: lastAction.playerRole as DetectiveRole,
          finalRound: this.state.currentRound
        };
      }
    }

    // 2. Check if all detectives are immobilized (have 0 tickets / 0 legal moves)
    let anyDetectiveCanMove = false;
    for (const role of this.state.turnOrder) {
      if (role !== 'misterX') {
        if (this.getLegalMoves(role).length > 0) {
          anyDetectiveCanMove = true;
          break;
        }
      }
    }

    if (!anyDetectiveCanMove) {
      return {
        winner: 'misterX',
        reason: 'detectives_stuck',
        finalRound: this.state.currentRound
      };
    }

    return null;
  }

  /**
   * Returns a sanitized public game state safe to transmit to detective clients.
   * Mister X's true position is hidden unless surfacing or game over.
   */
  public getSanitizedStateForDetectives(): GameState {
    const sanitized = JSON.parse(JSON.stringify(this.state)) as GameState;
    const isGameOver = sanitized.status !== 'in_progress';
    // Mister X is visible only while his most recent move was a surfacing move.
    let lastXRecord: MoveRecord | undefined;
    for (let i = sanitized.moveHistory.length - 1; i >= 0; i--) {
      if (sanitized.moveHistory[i].playerRole === 'misterX') {
        lastXRecord = sanitized.moveHistory[i];
        break;
      }
    }
    const isSurfacedNow = !!lastXRecord?.surfaced;

    if (!isGameOver && !isSurfacedNow) {
      // Hide Mister X station
      sanitized.players.misterX.station = -1; // masked
    }

    // Public (possibly decoy-disguised) tickets keyed by round
    const publicTicketByRound = new Map<number, TicketType>();
    sanitized.misterXTravelLog.forEach(entry => publicTicketByRound.set(entry.round, entry.ticketUsed));

    // Sanitize moveHistory for Mister X moves
    sanitized.moveHistory = sanitized.moveHistory.map(record => {
      if (record.playerRole !== 'misterX' || isGameOver) return record;
      return {
        ...record,
        // Never reveal the origin, even on a surfacing move
        fromStation: -1,
        toStation: record.surfaced ? record.toStation : -1,
        // Use the public ticket so decoys are not undone by raw history
        ticketUsed: publicTicketByRound.get(record.round) ?? record.ticketUsed
      };
    });

    return sanitized;
  }
}
