import type { GameConfig, MoveAction, TicketType } from "@scotland-yard/common";

export interface StationPinPayload {
  stationId: number;
  type: "flag" | "question" | "cross" | "note";
  note?: string;
}

export const MAX_CHAT_LENGTH = 280;
export const MAX_NAME_LENGTH = 24;
export const MAX_PIN_COUNT = 400;
export const MAX_NOTE_LENGTH = 200;

const PIN_TYPES = new Set(["flag", "question", "cross", "note"]);
const TICKET_TYPES = new Set<string>(["taxi", "bus", "underground", "black", "doubleMove"]);
const ROLES = new Set<string>([
  "misterX",
  "detective_red",
  "detective_green",
  "detective_yellow",
  "detective_blue",
  "detective_purple"
]);
const CITY_IDS = new Set(["london", "paris", "newyork"]);
const DIFFICULTIES = new Set(["casual", "classic", "hard"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isValidRoleOrSpectator(v: unknown): boolean {
  return v === "spectator" || (typeof v === "string" && ROLES.has(v));
}

export function sanitizeName(v: unknown, fallback: string): string {
  if (typeof v !== "string") return fallback;
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const cleaned = v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_NAME_LENGTH);
  return cleaned || fallback;
}

export function sanitizeChatText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  const cleaned = v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_CHAT_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Validates an untrusted move payload. Returns null when malformed.
 */
export function parseMoveAction(v: unknown): MoveAction | null {
  if (!isPlainObject(v)) return null;
  const { playerRole, toStation, ticketUsed, isDoubleMove } = v;
  if (typeof playerRole !== "string" || !ROLES.has(playerRole)) return null;
  if (typeof toStation !== "number" || !Number.isInteger(toStation) || toStation < 1) return null;
  if (typeof ticketUsed !== "string" || !TICKET_TYPES.has(ticketUsed)) return null;
  if (isDoubleMove !== undefined && typeof isDoubleMove !== "boolean") return null;
  return {
    playerRole: playerRole as MoveAction["playerRole"],
    toStation,
    ticketUsed: ticketUsed as TicketType,
    isDoubleMove
  };
}

/**
 * Whitelists and range-checks a lobby config patch. Unknown keys are dropped.
 */
export function sanitizeConfigPatch(v: unknown): Partial<GameConfig> {
  const out: Partial<GameConfig> = {};
  if (!isPlainObject(v)) return out;

  if (typeof v.cityId === "string" && CITY_IDS.has(v.cityId)) out.cityId = v.cityId;
  if (typeof v.difficulty === "string" && DIFFICULTIES.has(v.difficulty)) {
    out.difficulty = v.difficulty as GameConfig["difficulty"];
  }
  if (typeof v.detectiveCount === "number" && Number.isInteger(v.detectiveCount)) {
    out.detectiveCount = Math.min(5, Math.max(1, v.detectiveCount));
  }
  if (typeof v.maxRounds === "number" && Number.isInteger(v.maxRounds)) {
    out.maxRounds = Math.min(40, Math.max(5, v.maxRounds));
  }
  if (typeof v.turnTimeLimitSeconds === "number" && Number.isFinite(v.turnTimeLimitSeconds)) {
    out.turnTimeLimitSeconds = Math.min(600, Math.max(0, Math.floor(v.turnTimeLimitSeconds)));
  }
  if (typeof v.tacticalMode === "boolean") out.tacticalMode = v.tacticalMode;
  return out;
}

/**
 * Validates a scratchpad pin map. Returns null when malformed or oversized.
 */
export function parsePins(v: unknown): Record<number, StationPinPayload> | null {
  if (!isPlainObject(v)) return null;
  const entries = Object.entries(v);
  if (entries.length > MAX_PIN_COUNT) return null;

  const out: Record<number, StationPinPayload> = {};
  for (const [key, raw] of entries) {
    const id = Number(key);
    if (!Number.isInteger(id) || id < 1) return null;
    if (!isPlainObject(raw)) return null;
    if (typeof raw.type !== "string" || !PIN_TYPES.has(raw.type)) return null;
    const pin: StationPinPayload = {
      stationId: id,
      type: raw.type as StationPinPayload["type"]
    };
    if (typeof raw.note === "string") pin.note = raw.note.slice(0, MAX_NOTE_LENGTH);
    out[id] = pin;
  }
  return out;
}

/**
 * Tiny fixed-window rate limiter keyed by socket id.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; windowStart: number }>();

  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  public allow(key: string, now: number = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return true;
    }
    entry.count++;
    return entry.count <= this.limit;
  }

  public forget(key: string): void {
    this.hits.delete(key);
  }
}
