import { randomUUID, timingSafeEqual } from "node:crypto";
import { ALL_DETECTIVE_ROLES } from "@scotland-yard/common";
import type {
  GameConfig,
  GameEngine,
  PlayerRole
} from "@scotland-yard/common";
import type { StationPinPayload } from "../security/validation.ts";

export interface PlayerSession {
  socketId: string;
  playerId: string;
  playerName: string;
  claimedRole: PlayerRole | "spectator";
  claimedRoles: PlayerRole[];
  isHost: boolean;
  isReady: boolean;
  /** Secret resume credential. NEVER included in public lobby state or broadcasts. */
  sessionToken: string;
  /** False while the player is inside the reconnect grace window. */
  connected: boolean;
}

export interface LobbyPlayerPublic {
  playerId: string;
  playerName: string;
  claimedRole: PlayerRole | "spectator";
  claimedRoles: PlayerRole[];
  isHost: boolean;
  isReady: boolean;
  isConnected: boolean;
}

export interface PublicLobbyState {
  roomCode: string;
  hostPlayerId: string;
  config: GameConfig;
  status: "lobby" | "in_game";
  players: LobbyPlayerPublic[];
  roleAssignments: Partial<Record<PlayerRole, string>>; // role -> playerName
}

export interface GameRoom {
  roomCode: string;
  hostSocketId: string;
  config: GameConfig;
  status: "lobby" | "in_game";
  players: Map<string, PlayerSession>; // socketId -> PlayerSession
  roleAssignments: Map<PlayerRole, string>; // role -> socketId
  engine?: GameEngine;
  scratchpadPins: Record<number, StationPinPayload>;
  createdAt: number;
}

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  /**
   * Generates a unique 6-character room code (e.g. 'SCOT42', 'XLND79').
   */
  public generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    do {
      code = "";
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  public createRoom(
    hostSocketId: string,
    hostPlayerId: string,
    hostName: string,
    config: GameConfig
  ): GameRoom {
    const roomCode = this.generateRoomCode();
    const hostSession: PlayerSession = {
      socketId: hostSocketId,
      playerId: hostPlayerId,
      playerName: hostName,
      claimedRole: "misterX", // Host defaults to Mister X
      claimedRoles: ["misterX"],
      isHost: true,
      isReady: true,
      sessionToken: randomUUID(),
      connected: true
    };

    const room: GameRoom = {
      roomCode,
      hostSocketId,
      config,
      status: "lobby",
      players: new Map([[hostSocketId, hostSession]]),
      roleAssignments: new Map([["misterX", hostSocketId]]),
      scratchpadPins: {},
      createdAt: Date.now()
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(hostSocketId, roomCode);
    return room;
  }

  public getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  public getRoomBySocket(socketId: string): GameRoom | undefined {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : undefined;
  }

  public joinRoom(
    roomCode: string,
    socketId: string,
    playerId: string,
    playerName: string
  ): { success: boolean; room?: GameRoom; session?: PlayerSession; error?: string } {
    const normalizedCode = roomCode.toUpperCase();
    const room = this.rooms.get(normalizedCode);
    if (!room) {
      return { success: false, error: `Room ${normalizedCode} not found.` };
    }

    // Late joiners are spectators; otherwise auto-assign an available detective slot
    let availableRole: PlayerRole | "spectator" = "spectator";
    if (room.status === "lobby") {
      for (const r of ALL_DETECTIVE_ROLES) {
        if (!room.roleAssignments.has(r)) {
          availableRole = r;
          break;
        }
      }
    }

    const session: PlayerSession = {
      socketId,
      playerId,
      playerName,
      claimedRole: availableRole,
      claimedRoles: availableRole !== "spectator" ? [availableRole] : [],
      isHost: false,
      isReady: false,
      sessionToken: randomUUID(),
      connected: true
    };

    room.players.set(socketId, session);
    if (availableRole !== "spectator") {
      room.roleAssignments.set(availableRole, socketId);
    }
    this.socketToRoom.set(socketId, normalizedCode);

    return { success: true, room, session };
  }

  public claimRole(
    roomCode: string,
    socketId: string,
    targetRole: PlayerRole | "spectator"
  ): { success: boolean; error?: string } {
    const room = this.getRoom(roomCode);
    if (!room) return { success: false, error: "Room not found." };
    const session = room.players.get(socketId);
    if (!session) return { success: false, error: "Player not in room." };

    // Roles are frozen once the match starts: a mid-game claim could otherwise
    // hand a detective the unredacted Mister X state.
    if (room.status !== "lobby") {
      return { success: false, error: "Roles cannot be changed after the match has started." };
    }
    if (targetRole === "spectator") {
      // Clear all roles currently held by this socket
      const keysToDelete: PlayerRole[] = [];
      room.roleAssignments.forEach((sId, role) => {
        if (sId === socketId) keysToDelete.push(role);
      });
      keysToDelete.forEach((role) => room.roleAssignments.delete(role));
      session.claimedRole = "spectator";
      session.claimedRoles = [];
      return { success: true };
    }

    if (targetRole === "misterX") {
      const currentHolder = room.roleAssignments.get("misterX");
      if (currentHolder && currentHolder !== socketId) {
        return { success: false, error: "Mister X is already claimed by another operative." };
      }
      // If already holding Mister X, unclaim to spectator
      if (currentHolder === socketId) {
        room.roleAssignments.delete("misterX");
        session.claimedRole = "spectator";
        session.claimedRoles = [];
        return { success: true };
      }
      // Claiming Mister X: release any detective roles
      const keysToDelete: PlayerRole[] = [];
      room.roleAssignments.forEach((sId, role) => {
        if (sId === socketId) keysToDelete.push(role);
      });
      keysToDelete.forEach((role) => room.roleAssignments.delete(role));
      room.roleAssignments.set("misterX", socketId);
      session.claimedRole = "misterX";
      session.claimedRoles = ["misterX"];
      return { success: true };
    }

    // Target role is a Detective
    // If currently holding Mister X, release Mister X first
    if (room.roleAssignments.get("misterX") === socketId) {
      room.roleAssignments.delete("misterX");
    }

    const currentHolder = room.roleAssignments.get(targetRole);
    if (currentHolder && currentHolder !== socketId) {
      return { success: false, error: `Role ${targetRole} is already claimed by another operative.` };
    }

    if (currentHolder === socketId) {
      // Toggle off / unclaim this detective role
      room.roleAssignments.delete(targetRole);
    } else {
      // Claim this detective role!
      room.roleAssignments.set(targetRole, socketId);
    }

    // Refresh session's claimedRoles
    const myRoles: PlayerRole[] = [];
    room.roleAssignments.forEach((sId, role) => {
      if (sId === socketId) myRoles.push(role);
    });
    session.claimedRoles = myRoles;
    session.claimedRole = myRoles.length > 0 ? myRoles[0] : "spectator";

    return { success: true };
  }

  /**
   * Flags a player as disconnected without freeing their seat (reconnect grace window).
   */
  public markDisconnected(socketId: string): { room?: GameRoom; session?: PlayerSession } {
    const room = this.getRoomBySocket(socketId);
    const session = room?.players.get(socketId);
    if (!room || !session) return {};
    session.connected = false;
    return { room, session };
  }

  /**
   * Rebinds an existing session (identified by its secret token) to a new socket.
   * Moves the seat, role assignments and host crown over atomically.
   */
  public resumeSession(
    roomCode: string,
    token: string,
    newSocketId: string
  ): {
    success: boolean;
    room?: GameRoom;
    session?: PlayerSession;
    oldSocketId?: string;
    error?: string;
  } {
    const room = this.getRoom(roomCode);
    const invalid = { success: false, error: "Session expired or invalid." };
    if (!room || typeof token !== "string") return invalid;

    let found: PlayerSession | undefined;
    const given = Buffer.from(token);
    for (const candidate of room.players.values()) {
      const expected = Buffer.from(candidate.sessionToken);
      if (expected.length === given.length && timingSafeEqual(expected, given)) {
        found = candidate;
        break;
      }
    }
    if (!found) return invalid;

    const oldSocketId = found.socketId;
    if (oldSocketId !== newSocketId) {
      room.players.delete(oldSocketId);
      found.socketId = newSocketId;
      room.players.set(newSocketId, found);

      for (const [role, sId] of Array.from(room.roleAssignments.entries())) {
        if (sId === oldSocketId) room.roleAssignments.set(role, newSocketId);
      }
      if (room.hostSocketId === oldSocketId) room.hostSocketId = newSocketId;
      this.socketToRoom.delete(oldSocketId);
      this.socketToRoom.set(newSocketId, room.roomCode);
    }
    found.connected = true;
    return { success: true, room, session: found, oldSocketId };
  }

  public updateConfig(roomCode: string, socketId: string, config: Partial<GameConfig>): boolean {
    const room = this.getRoom(roomCode);
    if (!room || room.hostSocketId !== socketId || room.status !== "lobby") return false;
    room.config = { ...room.config, ...config };
    return true;
  }

  public leaveRoom(socketId: string): { roomCode?: string; isEmpty?: boolean; newHostSocketId?: string } {
    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return {};
    this.socketToRoom.delete(socketId);

    const room = this.rooms.get(roomCode);
    if (!room) return {};

    // Remove all role assignments for this socket
    const keysToDelete: PlayerRole[] = [];
    room.roleAssignments.forEach((sId, role) => {
      if (sId === socketId) keysToDelete.push(role);
    });
    keysToDelete.forEach((role) => room.roleAssignments.delete(role));

    room.players.delete(socketId);

    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      return { roomCode, isEmpty: true };
    }

    let newHostSocketId: string | undefined;
    if (room.hostSocketId === socketId) {
      const nextHost = room.players.values().next().value;
      if (nextHost) {
        nextHost.isHost = true;
        room.hostSocketId = nextHost.socketId;
        newHostSocketId = nextHost.socketId;
      }
    }

    return { roomCode, isEmpty: false, newHostSocketId };
  }

  public getPublicLobbyState(room: GameRoom): PublicLobbyState {
    const playersList: LobbyPlayerPublic[] = Array.from(room.players.values()).map(p => {
      const myRoles: PlayerRole[] = [];
      room.roleAssignments.forEach((sId, role) => {
        if (sId === p.socketId) myRoles.push(role);
      });
      return {
        playerId: p.playerId,
        playerName: p.playerName,
        claimedRole: myRoles.length > 0 ? myRoles[0] : "spectator",
        claimedRoles: myRoles,
        isHost: p.isHost,
        isReady: p.isReady,
        isConnected: p.connected
      };
    });

    const roleAssignments: Partial<Record<PlayerRole, string>> = {};
    room.roleAssignments.forEach((sId, role) => {
      const p = room.players.get(sId);
      if (p) roleAssignments[role] = p.playerName;
    });

    const hostSession = room.players.get(room.hostSocketId);

    return {
      roomCode: room.roomCode,
      hostPlayerId: hostSession?.playerId || "",
      config: room.config,
      status: room.status,
      players: playersList,
      roleAssignments
    };
  }
}
