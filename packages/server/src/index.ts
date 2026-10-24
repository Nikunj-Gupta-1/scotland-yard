import http from "node:http";
import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import type { Socket } from "socket.io";
import type { GameConfig, MoveAction, PlayerRole } from "@scotland-yard/common";
import { RoomManager } from "./lobby/RoomManager.ts";
import type { GameRoom } from "./lobby/RoomManager.ts";
import { GameSessionController } from "./session/GameSessionController.ts";
import {
  RateLimiter,
  isValidRoleOrSpectator,
  parseMoveAction,
  parsePins,
  sanitizeChatText,
  sanitizeConfigPatch,
  sanitizeName
} from "./security/validation.ts";

type Ack = (res: object) => void;

// Comma-separated allow-list via CORS_ORIGIN; defaults to permissive for LAN play.
const corsOrigin: string | string[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : "*";

const chatLimiter = new RateLimiter(5, 3000);
const pinLimiter = new RateLimiter(20, 3000);

const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  }
});

const roomManager = new RoomManager();
const activeControllers = new Map<string, GameSessionController>();

// Healthcheck
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Room inquiry: rate-limited per IP and deliberately minimal (no config, no player data)
const roomLookupLimiter = new RateLimiter(30, 60_000);
app.get("/api/room/:code", (req, res) => {
  if (!roomLookupLimiter.allow(req.ip || "unknown")) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  const room = /^[A-Za-z0-9]{4,12}$/.test(req.params.code)
    ? roomManager.getRoom(req.params.code)
    : undefined;
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json({
    exists: true,
    joinable: room.status === "lobby",
    status: room.status
  });
});

/** How long a dropped player keeps their seat before bots take over. */
function reconnectGraceMs(): number {
  const parsed = Number(process.env.RECONNECT_GRACE_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 45_000;
}

// sessionToken -> pending "finalize leave" timer
const graceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Permanently removes a socket's seat: bots take over its roles, host crown moves on,
 * and empty rooms are torn down.
 */
function finalizeLeave(socketId: string): void {
  const leavingRoom = roomManager.getRoomBySocket(socketId);
  if (leavingRoom) {
    const token = leavingRoom.players.get(socketId)?.sessionToken;
    if (token) {
      clearTimeout(graceTimers.get(token));
      graceTimers.delete(token);
    }
    // Hand the leaver's roles to bots before lobby state forgets them
    activeControllers.get(leavingRoom.roomCode)?.releaseSocket(socketId);
  }

  const { roomCode, isEmpty, newHostSocketId } = roomManager.leaveRoom(socketId);
  if (!roomCode) return;

  if (isEmpty) {
    const ctrl = activeControllers.get(roomCode);
    if (ctrl) {
      ctrl.destroy();
      activeControllers.delete(roomCode);
    }
    return;
  }

  const room = roomManager.getRoom(roomCode);
  if (room) {
    io.to(`room:${roomCode}`).emit("LOBBY_STATE", roomManager.getPublicLobbyState(room));
    if (newHostSocketId) {
      io.to(`room:${roomCode}`).emit("HOST_CHANGED", { newHostSocketId });
    }
  }
}

/**
 * Broadcasts sanitized state to each player in the room based on their individual role.
 */
function broadcastSanitizedGameState(room: GameRoom, controller: GameSessionController) {
  room.players.forEach((_session, socketId) => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      // Viewer role comes from the controller's frozen assignments, never the lobby session
      const sanitized = controller.getSanitizedState(controller.getViewerRole(socketId));
      socket.emit("GAME_STATE_UPDATE", sanitized);
    }
  });
}

io.on("connection", (socket: Socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // CREATE LOBBY
  socket.on(
    "LOBBY_CREATE",
    (
      payload: { hostName: string; config?: Partial<GameConfig> },
      callback?: Ack
    ) => {
      const defaultConfig: GameConfig = {
        cityId: "london",
        difficulty: "classic",
        detectiveCount: 5,
        turnTimeLimitSeconds: 60,
        tacticalMode: false,
        maxRounds: 24,
        ...sanitizeConfigPatch(payload?.config)
      };

      const room = roomManager.createRoom(
        socket.id,
        `player_${randomUUID().slice(0, 8)}`,
        sanitizeName(payload?.hostName, "Host"),
        defaultConfig
      );

      socket.join(`room:${room.roomCode}`);
      const lobbyState = roomManager.getPublicLobbyState(room);
      const hostSession = room.players.get(socket.id)!;

      callback?.({
        success: true,
        roomCode: room.roomCode,
        lobbyState,
        playerId: hostSession.playerId,
        sessionToken: hostSession.sessionToken
      });
      socket.emit("LOBBY_STATE", lobbyState);
    }
  );

  // JOIN LOBBY
  socket.on(
    "LOBBY_JOIN",
    (
      payload: { roomCode: string; playerName: string },
      callback?: Ack
    ) => {
      if (typeof payload?.roomCode !== "string") {
        callback?.({ success: false, error: "Invalid room code." });
        return;
      }
      const { success, room, session, error } = roomManager.joinRoom(
        payload.roomCode,
        socket.id,
        `player_${randomUUID().slice(0, 8)}`,
        sanitizeName(payload.playerName, "Detective")
      );

      if (!success || !room || !session) {
        callback?.({ success: false, error: error || "Failed to join room." });
        return;
      }

      socket.join(`room:${room.roomCode}`);
      const lobbyState = roomManager.getPublicLobbyState(room);

      // Notify caller
      callback?.({
        success: true,
        roomCode: room.roomCode,
        lobbyState,
        playerId: session.playerId,
        sessionToken: session.sessionToken,
        session: {
          claimedRole: session.claimedRole,
          claimedRoles: session.claimedRoles,
          isHost: session.isHost
        }
      });

      // Broadcast to room
      io.to(`room:${room.roomCode}`).emit("LOBBY_STATE", lobbyState);

      // If already in game, send current state
      const controller = activeControllers.get(room.roomCode);
      if (controller) {
        const state = controller.getSanitizedState(controller.getViewerRole(socket.id));
        socket.emit("GAME_STATE_UPDATE", state);
      }
    }
  );

  // SESSION RESUME (reconnect after refresh / network drop)
  socket.on(
    "SESSION_RESUME",
    (payload: { roomCode: string; sessionToken: string }, callback?: Ack) => {
      if (typeof payload?.roomCode !== "string" || typeof payload?.sessionToken !== "string") {
        callback?.({ success: false, error: "Invalid resume request." });
        return;
      }
      const res = roomManager.resumeSession(payload.roomCode, payload.sessionToken, socket.id);
      if (!res.success || !res.room || !res.session) {
        callback?.({ success: false, error: res.error || "Session expired or invalid." });
        return;
      }

      const { room, session, oldSocketId } = res;
      clearTimeout(graceTimers.get(session.sessionToken));
      graceTimers.delete(session.sessionToken);

      const controller = activeControllers.get(room.roomCode);
      if (oldSocketId && oldSocketId !== socket.id) {
        controller?.rebindSocket(oldSocketId, socket.id);
        // A stale duplicate connection (e.g. old tab) must not keep acting for this seat
        io.sockets.sockets.get(oldSocketId)?.disconnect(true);
      }

      socket.join(`room:${room.roomCode}`);
      const lobbyState = roomManager.getPublicLobbyState(room);
      callback?.({
        success: true,
        roomCode: room.roomCode,
        lobbyState,
        playerId: session.playerId,
        session: {
          claimedRole: session.claimedRole,
          claimedRoles: session.claimedRoles,
          isHost: session.isHost
        }
      });
      io.to(`room:${room.roomCode}`).emit("LOBBY_STATE", lobbyState);

      if (controller) {
        socket.emit("GAME_STATE_UPDATE", controller.getSanitizedState(controller.getViewerRole(socket.id)));
        if (session.claimedRole !== "misterX") {
          socket.emit("SCRATCHPAD_SYNC", room.scratchpadPins);
        }
      }
    }
  );

  // CLAIM ROLE
  socket.on(
    "ROLE_CLAIM",
    (
      payload: { roomCode: string; role: PlayerRole | "spectator" },
      callback?: Ack
    ) => {
      if (typeof payload?.roomCode !== "string" || !isValidRoleOrSpectator(payload.role)) {
        callback?.({ success: false, error: "Invalid role claim." });
        return;
      }
      const res = roomManager.claimRole(payload.roomCode, socket.id, payload.role);
      if (!res.success) {
        callback?.({ success: false, error: res.error });
        return;
      }

      const room = roomManager.getRoom(payload.roomCode);
      if (room) {
        const lobbyState = roomManager.getPublicLobbyState(room);
        io.to(`room:${room.roomCode}`).emit("LOBBY_STATE", lobbyState);
      }
      callback?.({ success: true });
    }
  );

  // CONFIG UPDATE
  socket.on(
    "CONFIG_UPDATE",
    (
      payload: { roomCode: string; config: Partial<GameConfig> },
      callback?: Ack
    ) => {
      if (typeof payload?.roomCode !== "string") {
        callback?.({ success: false, error: "Invalid room code." });
        return;
      }
      const ok = roomManager.updateConfig(
        payload.roomCode,
        socket.id,
        sanitizeConfigPatch(payload.config)
      );
      if (!ok) {
        callback?.({
          success: false,
          error: "Only the host can modify config, and only before the match starts."
        });
        return;
      }

      const room = roomManager.getRoom(payload.roomCode);
      if (room) {
        const lobbyState = roomManager.getPublicLobbyState(room);
        io.to(`room:${room.roomCode}`).emit("LOBBY_STATE", lobbyState);
      }
      callback?.({ success: true });
    }
  );

  // GAME START
  socket.on(
    "GAME_START",
    (payload: { roomCode: string }, callback?: Ack) => {
      const room =
        typeof payload?.roomCode === "string" ? roomManager.getRoom(payload.roomCode) : undefined;
      if (!room) {
        callback?.({ success: false, error: "Room not found." });
        return;
      }
      if (room.hostSocketId !== socket.id) {
        callback?.({ success: false, error: "Only host can start the game." });
        return;
      }
      if (room.status !== "lobby") {
        callback?.({ success: false, error: "Match already started." });
        return;
      }

      room.status = "in_game";

      // Player names map
      const playerNames = new Map<string, string>();
      room.players.forEach((p, sId) => {
        playerNames.set(sId, p.playerName);
      });

      const controller = new GameSessionController(
        room.roomCode,
        room.config,
        room.roleAssignments,
        playerNames,
        {
          onStateUpdate: () => {
            broadcastSanitizedGameState(room, controller);
          },
          onTimerTick: (secondsLeft) => {
            io.to(`room:${room.roomCode}`).emit("TIMER_TICK", { secondsLeft });
          },
          onGameOver: (winner) => {
            io.to(`room:${room.roomCode}`).emit("GAME_OVER", {
              winner,
              finalState: controller.engine.state
            });
          }
        }
      );

      activeControllers.set(room.roomCode, controller);
      controller.start();

      // Emit game start
      io.to(`room:${room.roomCode}`).emit("GAME_STARTED");

      // Broadcast initial sanitized state
      broadcastSanitizedGameState(room, controller);

      callback?.({ success: true });
    }
  );

  // MAKE MOVE
  socket.on(
    "MAKE_MOVE",
    (
      payload: { roomCode: string; action: MoveAction },
      callback?: Ack
    ) => {
      const controller = activeControllers.get(String(payload?.roomCode).toUpperCase());
      if (!controller) {
        callback?.({ success: false, error: "No active game found." });
        return;
      }

      const action = parseMoveAction(payload.action);
      if (!action) {
        callback?.({ success: false, error: "Malformed move." });
        return;
      }

      const result = controller.executeMove(socket.id, action);
      callback?.({ success: result.valid, ...result });
    }
  );

  // TACTICAL ACTIONS (Roadblock / Radar / Decoy)
  socket.on(
    "TACTICAL_ACTION",
    (
      payload: {
        roomCode: string;
        type: "roadblock" | "radar" | "decoy";
        stationId?: number;
      },
      callback?: Ack
    ) => {
      const controller = activeControllers.get(String(payload?.roomCode).toUpperCase());
      if (!controller) {
        callback?.({ success: false, error: "No active game found." });
        return;
      }

      const stationOk =
        typeof payload.stationId === "number" && Number.isInteger(payload.stationId);
      if (payload.type === "roadblock" && stationOk) {
        const res = controller.deployRoadblock(socket.id, payload.stationId as number);
        callback?.({ success: res.valid, ...res });
      } else if (payload.type === "radar" && stationOk) {
        const res = controller.executeRadarPing(socket.id, payload.stationId as number);
        callback?.({ success: !!res.result, result: res.result, error: res.error });
      } else if (payload.type === "decoy") {
        const res = controller.activateDecoy(socket.id);
        callback?.({ success: res.valid, ...res });
      } else {
        callback?.({ success: false, error: "Invalid tactical action." });
      }
    }
  );

  // SCRATCHPAD PINS SYNC (detectives only)
  socket.on("SCRATCHPAD_UPDATE", (payload: { roomCode: string; pins: unknown }) => {
    // Trust the socket's own room, not the client-supplied code
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const sender = room.players.get(socket.id);
    if (!sender || sender.claimedRole === "misterX") return;
    if (!pinLimiter.allow(socket.id)) return;

    const pins = parsePins(payload?.pins);
    if (!pins) return;

    room.scratchpadPins = pins;

    // Broadcast pins to all detectives and spectators, excluding Mister X
    room.players.forEach((session, sId) => {
      if (session.claimedRole !== "misterX") {
        io.to(sId).emit("SCRATCHPAD_SYNC", pins);
      }
    });
  });

  // IN-GAME CHAT
  socket.on(
    "CHAT_MESSAGE",
    (payload: { roomCode: string; text: unknown; channel: "all" | "detectives" }) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const sender = room.players.get(socket.id);
      if (!sender) return;
      if (!chatLimiter.allow(socket.id)) return;

      const text = sanitizeChatText(payload?.text);
      if (!text) return;
      const channel = payload.channel === "detectives" ? "detectives" : "all";

      // Mister X may never inject into (or listen to) the detectives' channel
      if (channel === "detectives" && sender.claimedRole === "misterX") return;

      const chatPayload = {
        sender: sender.playerName,
        role: sender.claimedRole,
        text,
        channel,
        timestamp: Date.now()
      };

      if (channel === "all") {
        io.to(`room:${room.roomCode}`).emit("CHAT_MESSAGE", chatPayload);
      } else {
        // Only detectives and spectators receive detectives squad chat
        room.players.forEach((s, sId) => {
          if (s.claimedRole !== "misterX") {
            io.to(sId).emit("CHAT_MESSAGE", chatPayload);
          }
        });
      }
    }
  );

  // EXPLICIT LEAVE: the player chose to quit, so skip the reconnect grace window
  socket.on("LOBBY_LEAVE", (_payload: unknown, callback?: Ack) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (room) socket.leave(`room:${room.roomCode}`);
    finalizeLeave(socket.id);
    callback?.({ success: true });
  });

  // DISCONNECT: keep the seat for a grace window so the player can resume
  socket.on("disconnect", () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    chatLimiter.forget(socket.id);
    pinLimiter.forget(socket.id);

    const { room, session } = roomManager.markDisconnected(socket.id);
    if (!room || !session) return;

    io.to(`room:${room.roomCode}`).emit("LOBBY_STATE", roomManager.getPublicLobbyState(room));

    const disconnectedSocketId = socket.id;
    const token = session.sessionToken;
    clearTimeout(graceTimers.get(token));
    const timer = setTimeout(() => {
        graceTimers.delete(token);
        // Only finalize if the player never came back on a new socket
        const current = roomManager.getRoomBySocket(disconnectedSocketId);
        if (current?.players.get(disconnectedSocketId)?.sessionToken === token) {
          finalizeLeave(disconnectedSocketId);
        }
    }, reconnectGraceMs());
    timer.unref?.();
    graceTimers.set(token, timer);
  });
});

const PORT = process.env.PORT || 3001;

// Only start listening if index.ts is run directly (not imported in tests)
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`[Scotland Yard Server] Real-time multiplayer listening on port ${PORT}`);
  });
}

export { app, server, io, roomManager, activeControllers };
