export type TransportType = 'taxi' | 'bus' | 'underground' | 'ferry';

export type TicketType = 'taxi' | 'bus' | 'underground' | 'black' | 'doubleMove';

export interface StationNode {
  id: number;
  x: number;
  y: number;
  transports: TransportType[];
  name?: string;
}

export interface RouteEdge {
  from: number;
  to: number;
  transport: TransportType;
}

export interface CityMapData {
  id: string;
  name: string;
  width: number;
  height: number;
  stations: StationNode[];
  edges: RouteEdge[];
  surfacingRounds: number[];
  startPositions: {
    misterX: number[];
    detectives: number[];
  };
}

export interface TicketInventory {
  taxi: number;
  bus: number;
  underground: number;
  black: number;
  doubleMove: number;
}

export type DetectiveRole =
  | 'detective_red'
  | 'detective_green'
  | 'detective_yellow'
  | 'detective_blue'
  | 'detective_purple';

export type PlayerRole = 'misterX' | DetectiveRole;

export interface PlayerState {
  id: string;
  role: PlayerRole;
  name: string;
  isAI: boolean;
  station: number;
  tickets: TicketInventory;
}

export interface MoveRecord {
  round: number;
  playerRole: PlayerRole;
  fromStation: number;
  toStation: number;
  ticketUsed: TicketType;
  surfaced: boolean;
  timestamp: number;
  isDoubleMove?: boolean;
}

export interface TravelLogEntry {
  round: number;
  ticketUsed: TicketType;
  revealedStation?: number;
  isDoubleMoveFirstHalf?: boolean;
}

export interface GameConfig {
  cityId: string;
  difficulty: 'casual' | 'classic' | 'hard';
  detectiveCount: number; // 3, 4, or 5
  maxRounds: number;      // standard = 24
  turnTimeLimitSeconds?: number;
  tacticalMode?: boolean;
}

export interface Roadblock {
  stationId: number;
  placedByRole: PlayerRole;
  roundsRemaining: number;
}

export interface RadarPingResult {
  stationId: number;
  detected: boolean;
  actualDistance?: number;
}

export interface TacticalState {
  roadblocks: Roadblock[];
  detectiveRoadblocksRemaining: number;
  detectiveRadarPingsRemaining: number;
  misterXDecoysRemaining: number;
  activeDecoyNextMove?: boolean;
}

export type GameStatus = 'waiting' | 'in_progress' | 'detectives_won' | 'mister_x_won';

export interface WinInfo {
  winner: 'detectives' | 'misterX';
  reason: 'captured' | 'mister_x_trapped' | 'detectives_stuck' | 'rounds_exhausted';
  capturingDetective?: DetectiveRole;
  finalRound: number;
}

export interface GameState {
  gameId: string;
  config: GameConfig;
  status: GameStatus;
  currentRound: number;
  activeRole: PlayerRole;
  turnOrder: PlayerRole[];
  turnIndex: number;
  players: Record<PlayerRole, PlayerState>;
  misterXTravelLog: TravelLogEntry[];
  moveHistory: MoveRecord[];
  winInfo?: WinInfo;
  doubleMoveActive?: boolean;
  /** True while Mister X owes the second move of a double move. */
  doubleMoveSecondHalf?: boolean;
  tacticalState?: TacticalState;
}

export interface MoveAction {
  playerRole: PlayerRole;
  toStation: number;
  ticketUsed: TicketType;
  isDoubleMove?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
