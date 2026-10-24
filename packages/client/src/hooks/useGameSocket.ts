"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import type {
  GameConfig,
  GameState,
  MoveAction,
  PlayerRole,
  RadarPingResult,
  ValidationResult
} from "@scotland-yard/common";

export interface PublicLobbyPlayer {
  playerId: string;
  playerName: string;
  claimedRole: PlayerRole | "spectator";
  claimedRoles?: PlayerRole[];
  isHost: boolean;
  isReady: boolean;
  isConnected?: boolean;
}

/** Shape of the pins relayed through the scratchpad sync events. */
export interface SyncedPin {
  stationId: number;
  type: "flag" | "question" | "cross" | "note";
  note?: string;
}

interface StoredSession {
  roomCode: string;
  sessionToken: string;
  playerId: string;
}

interface SessionAck {
  success: boolean;
  roomCode?: string;
  lobbyState?: PublicLobbyState;
  playerId?: string;
  sessionToken?: string;
  session?: { claimedRole: PlayerRole | "spectator"; claimedRoles?: PlayerRole[]; isHost: boolean };
  error?: string;
}

// sessionStorage (per tab) holds only the resume credential - never any game state.
const SESSION_KEY = "scotland-yard:session";

function readStoredSession(): StoredSession | null {
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_KEY) : null;
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null): void {
  try {
    if (session) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode) - resume simply won't survive a refresh */
  }
}

export interface PublicLobbyState {
  roomCode: string;
  hostPlayerId: string;
  config: GameConfig;
  status: "lobby" | "in_game";
  players: PublicLobbyPlayer[];
  roleAssignments: Partial<Record<PlayerRole, string>>;
}

export interface ChatMessage {
  sender: string;
  role: string;
  text: string;
  channel: "all" | "detectives";
  timestamp: number;
}

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [lobbyState, setLobbyState] = useState<PublicLobbyState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<PlayerRole | "spectator" | null>(null);
  const [myRoles, setMyRoles] = useState<PlayerRole[]>([]);
  const [isHost, setIsHost] = useState(false);

  const [multiplayerGameState, setMultiplayerGameState] = useState<GameState | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [remotePins, setRemotePins] = useState<Record<number, SyncedPin>>({});
  const [resumedFromRefresh, setResumedFromRefresh] = useState(false);
  const myPlayerIdRef = useRef<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const applySession = useCallback((res: SessionAck) => {
    if (res.playerId) {
      myPlayerIdRef.current = res.playerId;
      setMyPlayerId(res.playerId);
    }
    if (res.roomCode) setRoomCode(res.roomCode);
    if (res.lobbyState) setLobbyState(res.lobbyState);
    if (res.session) {
      setMyRole(res.session.claimedRole);
      setMyRoles(
        res.session.claimedRoles ??
          (res.session.claimedRole !== "spectator" ? [res.session.claimedRole] : [])
      );
      setIsHost(res.session.isHost);
    }
  }, []);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setConnectionError(null);

      // Page refresh or network blip: try to take our seat back
      const stored = readStoredSession();
      if (stored) {
        socket.emit(
          "SESSION_RESUME",
          { roomCode: stored.roomCode, sessionToken: stored.sessionToken },
          (res: SessionAck) => {
            if (res.success) {
              applySession(res);
              setResumedFromRefresh(true);
            } else {
              writeStoredSession(null);
            }
          }
        );
      }
    });

    socket.on("connect_error", (err) => {
      setConnected(false);
      setConnectionError(err.message);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("LOBBY_STATE", (state: PublicLobbyState) => {
      setLobbyState(state);
      setRoomCode(state.roomCode);

      // Find our own seat by the stable playerId handed out by the server
      const me = state.players.find((p) => p.playerId === myPlayerIdRef.current);
      if (me) {
        setMyPlayerId(me.playerId);
        setMyRole(me.claimedRole);
        setMyRoles(me.claimedRoles ?? (me.claimedRole !== "spectator" ? [me.claimedRole] : []));
        setIsHost(me.isHost);
      }
    });

    socket.on("GAME_STARTED", () => {
      setLobbyState((prev) => (prev ? { ...prev, status: "in_game" } : prev));
    });

    socket.on("GAME_STATE_UPDATE", (state: GameState) => {
      setMultiplayerGameState(state);
    });

    socket.on("TIMER_TICK", ({ secondsLeft }: { secondsLeft: number }) => {
      setTimerSeconds(secondsLeft);
    });

    socket.on("GAME_OVER", ({ finalState }: { winner: string; finalState: GameState }) => {
      setMultiplayerGameState(finalState);
    });

    socket.on("SCRATCHPAD_SYNC", (pins: Record<number, SyncedPin>) => {
      setRemotePins(pins);
    });

    socket.on("CHAT_MESSAGE", (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [applySession]);

  const createRoom = useCallback(
    (hostName: string, config?: Partial<GameConfig>): Promise<{ success: boolean; roomCode?: string; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !socketRef.current.connected) {
          resolve({ success: false, error: "Not connected to multiplayer server." });
          return;
        }

        socketRef.current.emit(
          "LOBBY_CREATE",
          { hostName, config },
          (res: SessionAck) => {
            if (res.success && res.roomCode) {
              applySession(res);
              setIsHost(true);
              setMyRole("misterX");
              if (res.sessionToken && res.playerId) {
                writeStoredSession({
                  roomCode: res.roomCode,
                  sessionToken: res.sessionToken,
                  playerId: res.playerId
                });
              }
              resolve({ success: true, roomCode: res.roomCode });
            } else {
              resolve({ success: false, error: res.error || "Failed to create room." });
            }
          }
        );
      });
    },
    [applySession]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !socketRef.current.connected) {
          resolve({ success: false, error: "Not connected to multiplayer server." });
          return;
        }

        socketRef.current.emit(
          "LOBBY_JOIN",
          { roomCode: code.toUpperCase(), playerName },
          (res: SessionAck) => {
            if (res.success && res.roomCode) {
              applySession(res);
              if (res.sessionToken && res.playerId) {
                writeStoredSession({
                  roomCode: res.roomCode,
                  sessionToken: res.sessionToken,
                  playerId: res.playerId
                });
              }
              resolve({ success: true });
            } else {
              resolve({ success: false, error: res.error || "Failed to join room." });
            }
          }
        );
      });
    },
    [applySession]
  );

  const claimRole = useCallback(
    (role: PlayerRole | "spectator"): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !roomCode) {
          resolve({ success: false, error: "Not connected or not in a room." });
          return;
        }

        socketRef.current.emit(
          "ROLE_CLAIM",
          { roomCode, role },
          (res: { success: boolean; error?: string }) => {
            if (res.success) {
              setMyRole(role);
              resolve({ success: true });
            } else {
              resolve({ success: false, error: res.error });
            }
          }
        );
      });
    },
    [roomCode]
  );

  const updateConfig = useCallback(
    (config: Partial<GameConfig>): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !roomCode) {
          resolve({ success: false, error: "Not connected or not in a room." });
          return;
        }

        socketRef.current.emit(
          "CONFIG_UPDATE",
          { roomCode, config },
          (res: { success: boolean; error?: string }) => {
            resolve(res);
          }
        );
      });
    },
    [roomCode]
  );

  const startGame = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current || !roomCode) {
        resolve({ success: false, error: "Not connected or not in a room." });
        return;
      }

      socketRef.current.emit(
        "GAME_START",
        { roomCode },
        (res: { success: boolean; error?: string }) => {
          resolve(res);
        }
      );
    });
  }, [roomCode]);

  const makeMove = useCallback(
    (action: MoveAction): Promise<ValidationResult> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !roomCode) {
          resolve({ valid: false, error: "Not connected or not in a room." });
          return;
        }

        socketRef.current.emit(
          "MAKE_MOVE",
          { roomCode, action },
          (res: ValidationResult) => {
            resolve(res);
          }
        );
      });
    },
    [roomCode]
  );

  const sendTacticalAction = useCallback(
    (
      type: "roadblock" | "radar" | "decoy",
      stationId?: number
    ): Promise<{ success: boolean; result?: RadarPingResult | null; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current || !roomCode) {
          resolve({ success: false, error: "Not connected or not in a room." });
          return;
        }

        socketRef.current.emit(
          "TACTICAL_ACTION",
          { roomCode, type, stationId },
          (res: { success: boolean; result?: RadarPingResult | null; error?: string }) => {
            resolve(res);
          }
        );
      });
    },
    [roomCode]
  );

  const updatePins = useCallback(
    (pins: Record<number, SyncedPin>) => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit("SCRATCHPAD_UPDATE", { roomCode, pins });
    },
    [roomCode]
  );

  const sendChatMessage = useCallback(
    (text: string, channel: "all" | "detectives" = "all") => {
      if (!socketRef.current || !roomCode) return;
      socketRef.current.emit("CHAT_MESSAGE", { roomCode, text, channel });
    },
    [roomCode]
  );

  const leaveRoom = useCallback(() => {
    // Explicit leave: forget the resume credential and free the seat immediately
    writeStoredSession(null);
    socketRef.current?.emit("LOBBY_LEAVE", {});
    myPlayerIdRef.current = null;
    setResumedFromRefresh(false);
    setRoomCode(null);
    setLobbyState(null);
    setMultiplayerGameState(null);
    setMyRole(null);
    setIsHost(false);
    setChatMessages([]);
  }, []);

  return {
    connected,
    connectionError,
    roomCode,
    lobbyState,
    myPlayerId,
    myRole,
    myRoles,
    isHost,
    resumedFromRefresh,
    multiplayerGameState,
    timerSeconds,
    remotePins,
    chatMessages,
    createRoom,
    joinRoom,
    claimRole,
    updateConfig,
    startGame,
    makeMove,
    sendTacticalAction,
    updatePins,
    sendChatMessage,
    leaveRoom
  };
}
