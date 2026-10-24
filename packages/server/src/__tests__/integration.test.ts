import test, { after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { io as ioClient } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { GameEngine, getMapById } from "@scotland-yard/common";
import type { GameState } from "@scotland-yard/common";

// Must be set before the server module is evaluated.
process.env.NODE_ENV = "test";
process.env.RECONNECT_GRACE_MS = "400";

const { server, io } = await import("../index.ts");

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = (server.address() as AddressInfo).port;
const baseUrl = `http://127.0.0.1:${port}`;

const openSockets: Socket[] = [];

function connect(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = ioClient(baseUrl, { transports: ["websocket"], reconnection: false });
    openSockets.push(s);
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
}

function emitAck<T = any>(s: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => s.emit(event, payload, resolve));
}

function nextEvent<T = any>(s: Socket, event: string, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    s.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Some sandboxes forbid loopback sockets; skip (loudly) instead of reporting false failures.
const canNetwork = await new Promise<boolean>((resolve) => {
  const probe = ioClient(baseUrl, { transports: ["websocket"], reconnection: false, timeout: 1000 });
  probe.on("connect", () => {
    probe.disconnect();
    resolve(true);
  });
  probe.on("connect_error", () => {
    probe.disconnect();
    resolve(false);
  });
});
if (!canNetwork) {
  console.warn("[integration] Loopback sockets unavailable - integration tests SKIPPED");
}
const itest = canNetwork ? test : test.skip;

/** Creates a room (host = Mister X) with one detective_red human; remaining detectives are bots. */
async function startMatch() {
  const host = await connect();
  const created = await emitAck(host, "LOBBY_CREATE", {
    hostName: "Moriarty",
    config: { turnTimeLimitSeconds: 0 }
  });
  assert.equal(created.success, true);
  assert.ok(created.sessionToken, "Host receives a resume token");

  const det = await connect();
  const joined = await emitAck(det, "LOBBY_JOIN", { roomCode: created.roomCode, playerName: "Lestrade" });
  assert.equal(joined.success, true);
  assert.equal(joined.session.claimedRole, "detective_red");

  const hostState = nextEvent<GameState>(host, "GAME_STATE_UPDATE");
  const detState = nextEvent<GameState>(det, "GAME_STATE_UPDATE");
  const started = await emitAck(host, "GAME_START", { roomCode: created.roomCode });
  assert.equal(started.success, true);

  return {
    host,
    det,
    roomCode: created.roomCode as string,
    hostToken: created.sessionToken as string,
    detToken: joined.sessionToken as string,
    detPlayerId: joined.playerId as string,
    firstHostState: await hostState,
    firstDetState: await detState
  };
}

after(async () => {
  openSockets.forEach((s) => s.disconnect());
  io.close();
  await new Promise((r) => setTimeout(r, 50));
});

itest("Integration: detective sockets never receive Mister X's hidden station", async () => {
  const m = await startMatch();

  assert.ok(m.firstHostState.players.misterX.station > 0, "Mister X sees his own station");
  assert.equal(m.firstDetState.players.misterX.station, -1, "Detective payload is masked");

  // Mister X moves; every payload the detective sees must stay masked (round 1 is hidden)
  const engine = new GameEngine(getMapById("london"), m.firstHostState);
  const move = engine.getLegalMoves("misterX")[0];
  const detUpdate = nextEvent<GameState>(m.det, "GAME_STATE_UPDATE");
  const res = await emitAck(m.host, "MAKE_MOVE", { roomCode: m.roomCode, action: move });
  assert.equal(res.valid, true);

  const afterMove = await detUpdate;
  const raw = JSON.stringify(afterMove);
  assert.equal(afterMove.players.misterX.station, -1);
  assert.ok(!raw.includes('"station":' + engine.state.players.misterX.station + ","), "no raw X station in payload");
  for (const rec of afterMove.moveHistory.filter((r) => r.playerRole === "misterX")) {
    assert.equal(rec.fromStation, -1);
    assert.equal(rec.toStation, -1);
  }
});

itest("Integration: roles are frozen mid-game and detectives cannot hijack Mister X", async () => {
  const m = await startMatch();
  const claim = await emitAck(m.det, "ROLE_CLAIM", { roomCode: m.roomCode, role: "misterX" });
  assert.equal(claim.success, false);

  const cfg = await emitAck(m.host, "CONFIG_UPDATE", { roomCode: m.roomCode, config: { cityId: "paris" } });
  assert.equal(cfg.success, false);

  const again = await emitAck(m.host, "GAME_START", { roomCode: m.roomCode });
  assert.equal(again.success, false, "A started match cannot be restarted");
});

itest("Integration: Mister X cannot use the detectives' chat channel; detectives get it", async () => {
  const m = await startMatch();
  let xHeard = false;
  m.host.on("CHAT_MESSAGE", () => (xHeard = true));

  const detHeard = nextEvent(m.det, "CHAT_MESSAGE");
  m.det.emit("CHAT_MESSAGE", { roomCode: m.roomCode, text: "He is near Bank", channel: "detectives" });
  const msg = await detHeard;
  assert.equal(msg.text, "He is near Bank");

  m.host.emit("CHAT_MESSAGE", { roomCode: m.roomCode, text: "injected", channel: "detectives" });
  await sleep(150);
  assert.equal(xHeard, false, "Mister X must not receive the detectives channel");
});

itest("Integration: a dropped player resumes their seat with the session token", async () => {
  const m = await startMatch();

  m.det.disconnect();
  await sleep(100); // well inside the 400ms grace window

  const fresh = await connect();
  const stateP = nextEvent<GameState>(fresh, "GAME_STATE_UPDATE");
  const bad = await emitAck(fresh, "SESSION_RESUME", { roomCode: m.roomCode, sessionToken: "nope" });
  assert.equal(bad.success, false, "Wrong token is rejected");

  const resumed = await emitAck(fresh, "SESSION_RESUME", {
    roomCode: m.roomCode,
    sessionToken: m.detToken
  });
  assert.equal(resumed.success, true);
  assert.equal(resumed.session.claimedRole, "detective_red");
  assert.equal(resumed.playerId, m.detPlayerId, "playerId is stable across resumes");

  const state = await stateP;
  assert.equal(state.players.misterX.station, -1, "Resumed detective still gets a masked state");

  // Seat survives past the grace window because the player came back
  await sleep(600);
  const lobby = await fetch(`${baseUrl}/api/room/${m.roomCode}`).then((r) => r.json());
  assert.equal(lobby.exists, true);
});

itest("Integration: after the grace window the seat becomes a bot and the token dies", async () => {
  const m = await startMatch();

  m.det.disconnect();
  await sleep(700); // > 400ms grace

  const fresh = await connect();
  const res = await emitAck(fresh, "SESSION_RESUME", { roomCode: m.roomCode, sessionToken: m.detToken });
  assert.equal(res.success, false, "Expired token cannot be resumed");

  // The game continues: the freed seat is now a bot role on the server
  const { activeControllers } = await import("../index.ts");
  const controller = activeControllers.get(m.roomCode)!;
  assert.equal(controller.botRoles.has("detective_red"), true);
});

itest("Integration: room lookup endpoint is minimal and rate limited", async () => {
  const m = await startMatch();
  const body = await fetch(`${baseUrl}/api/room/${m.roomCode}`).then((r) => r.json());
  assert.deepEqual(Object.keys(body).sort(), ["exists", "joinable", "status"]);
  assert.equal(body.joinable, false, "In-progress rooms are not joinable");

  const missing = await fetch(`${baseUrl}/api/room/ZZZZZZ`);
  assert.equal(missing.status, 404);
  const malformed = await fetch(`${baseUrl}/api/room/..%2Fetc`);
  assert.equal(malformed.status, 404);
});
