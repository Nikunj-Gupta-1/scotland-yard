import test from "node:test";
import assert from "node:assert/strict";
import { LONDON_MAP, GameEngine } from "@scotland-yard/common";
import { RoomManager } from "../lobby/RoomManager.ts";
import { StateSanitizer } from "../security/StateSanitizer.ts";
import { GameSessionController } from "../session/GameSessionController.ts";

test("RoomManager generates 6-character room codes and manages player slots", () => {
  const rm = new RoomManager();
  const room = rm.createRoom("sock_host", "p_1", "Sherlock", {
    cityId: "london",
    difficulty: "classic",
    detectiveCount: 5,
    turnTimeLimitSeconds: 60,
    tacticalMode: false,
    maxRounds: 24
  });

  assert.equal(room.roomCode.length, 6);
  assert.equal(room.hostSocketId, "sock_host");
  assert.equal(room.roleAssignments.get("misterX"), "sock_host");

  // Join second player
  const joinRes = rm.joinRoom(room.roomCode, "sock_det", "p_2", "Watson");
  assert.equal(joinRes.success, true);
  assert.equal(joinRes.session?.claimedRole, "detective_red");

  // Try claiming already claimed role
  const claimRes = rm.claimRole(room.roomCode, "sock_det", "misterX");
  assert.equal(claimRes.success, false);

  // Claim available detective_blue (Watson can control both Red and Blue across his device)
  const claimBlue = rm.claimRole(room.roomCode, "sock_det", "detective_blue");
  assert.equal(claimBlue.success, true);
  assert.equal(room.roleAssignments.get("detective_blue"), "sock_det");
  assert.equal(room.roleAssignments.get("detective_red"), "sock_det");

  // Toggle off detective_red
  const toggleRed = rm.claimRole(room.roomCode, "sock_det", "detective_red");
  assert.equal(toggleRed.success, true);
  assert.equal(room.roleAssignments.has("detective_red"), false);

  // Config updates: non-host rejected, host allowed
  const nonHostConfig = rm.updateConfig(room.roomCode, "sock_det", { cityId: "paris" });
  assert.equal(nonHostConfig, false);
  const hostConfig = rm.updateConfig(room.roomCode, "sock_host", { cityId: "paris" });
  assert.equal(hostConfig, true);
  assert.equal(room.config.cityId, "paris");

  // Public lobby state
  const lobbyState = rm.getPublicLobbyState(room);
  assert.equal(lobbyState.roomCode, room.roomCode);
  assert.equal(lobbyState.players.length, 2);
  assert.equal(lobbyState.roleAssignments.detective_blue, "Watson");

  // Host leaves, passes host crown to Watson
  const leaveRes = rm.leaveRoom("sock_host");
  assert.equal(leaveRes.isEmpty, false);
  assert.equal(leaveRes.newHostSocketId, "sock_det");
  assert.equal(room.hostSocketId, "sock_det");

  // Watson leaves, room is cleaned up
  const finalLeave = rm.leaveRoom("sock_det");
  assert.equal(finalLeave.isEmpty, true);
  assert.equal(rm.getRoom(room.roomCode), undefined);
});

test("StateSanitizer redacts Mister X position and tactics for detectives and spectators", () => {
  const engine = new GameEngine(LONDON_MAP);
  engine.createNewGame(
    {
      cityId: "london",
      difficulty: "classic",
      detectiveCount: 5,
      turnTimeLimitSeconds: 60,
      tacticalMode: true,
      maxRounds: 24
    },
    { misterX: 35, detectives: [10, 20, 30, 40, 50] }
  );

  // Activate decoy for Mister X
  if (engine.state.tacticalState) {
    engine.state.tacticalState.activeDecoyNextMove = true;
  }

  // Recipient: misterX
  const xState = StateSanitizer.sanitize(engine, "misterX");
  assert.equal(xState.players.misterX.station, 35);
  assert.equal(xState.tacticalState?.activeDecoyNextMove, true);

  // Recipient: detective_red (Round 1 - Non-surfacing)
  const detState = StateSanitizer.sanitize(engine, "detective_red");
  assert.equal(detState.players.misterX.station, -1, "Mister X station must be redacted");
  assert.equal(detState.tacticalState?.activeDecoyNextMove, false, "Decoy intent must be hidden from detectives");

  // Recipient: spectator
  const specState = StateSanitizer.sanitize(engine, "spectator");
  assert.equal(specState.players.misterX.station, -1, "Mister X station must be redacted for spectators");

  // Simulate surfacing round (Round 3) after Mister X's surfacing move
  engine.state.currentRound = 3;
  engine.state.turnIndex = 1; // Mister X has moved in Round 3
  engine.state.moveHistory.push({
    round: 3,
    playerRole: "misterX",
    fromStation: 12,
    toStation: 35,
    ticketUsed: "taxi",
    surfaced: true,
    timestamp: Date.now()
  });
  engine.state.misterXTravelLog.push({ round: 3, ticketUsed: "taxi", revealedStation: 35 });
  const detSurfacedState = StateSanitizer.sanitize(engine, "detective_red");
  assert.equal(detSurfacedState.players.misterX.station, 35, "Station should be visible on surfacing round");
  const surfacedRecord = detSurfacedState.moveHistory[0];
  assert.equal(surfacedRecord.toStation, 35, "Surfaced destination is public");
  assert.equal(surfacedRecord.fromStation, -1, "Origin of the surfacing move must stay hidden");

  // Game over reveals station regardless of round
  engine.state.currentRound = 4;
  engine.state.turnIndex = 0;
  engine.state.status = "detectives_won";
  const detGameOverState = StateSanitizer.sanitize(engine, "detective_red");
  assert.equal(detGameOverState.players.misterX.station, 35, "Station should be visible on game over");
});

test("GameSessionController manages turns, bot roles, and zero-cheat state sanitization", () => {
  let updatesCount = 0;
  const roleAssignments = new Map([
    ["misterX", "sock_misterX"],
    ["detective_red", "sock_detRed"]
  ]);
  const playerNames = new Map([
    ["sock_misterX", "Professor Moriarty"],
    ["sock_detRed", "Inspector Lestrade"]
  ]);

  const controller = new GameSessionController(
    "ROOM42",
    {
      cityId: "london",
      difficulty: "classic",
      detectiveCount: 5,
      turnTimeLimitSeconds: 0,
      tacticalMode: true,
      maxRounds: 24
    },
    roleAssignments as any,
    playerNames,
    {
      onStateUpdate: () => {
        updatesCount++;
      }
    }
  );

  // Initial state checks
  assert.equal(controller.roomCode, "ROOM42");
  assert.equal(controller.botRoles.has("detective_green"), true, "Unassigned detective_green should be a bot");
  assert.equal(controller.botRoles.has("detective_red"), false, "Assigned detective_red is human");
  assert.equal(controller.botRoles.has("misterX"), false, "Assigned misterX is human");

  // State sanitization check
  const sanitizedForDet = controller.getSanitizedState("detective_red");
  assert.equal(sanitizedForDet.players.misterX.station, -1, "Station is hidden");
  const unmaskedForX = controller.getSanitizedState("misterX");
  assert.ok(unmaskedForX.players.misterX.station > 0, "Mister X sees true station");

  // Move validation: Detective cannot move out of turn
  const invalidMove = controller.executeMove("sock_detRed", {
    playerRole: "detective_red",
    toStation: 11,
    ticketUsed: "taxi"
  });
  assert.equal(invalidMove.valid, false, "Must reject move out of turn");

  // Mister X makes a legal move
  const misterXStation = controller.engine.state.players.misterX.station;
  const legalMoves = controller.engine.getLegalMoves("misterX");
  assert.ok(legalMoves.length > 0, "Mister X must have legal moves");

  const chosenMove = legalMoves[0];
  const validMoveRes = controller.executeMove("sock_misterX", {
    playerRole: "misterX",
    toStation: chosenMove.toStation,
    ticketUsed: chosenMove.ticketUsed
  });
  assert.equal(validMoveRes.valid, true, "Mister X move should succeed");
  assert.equal(controller.engine.state.activeRole, "detective_red", "Turn passes to detective_red");
  assert.ok(updatesCount > 0, "Update callback should be invoked");

  // Tactical abilities in session
  const radarPing = controller.executeRadarPing("sock_detRed", 10);
  assert.ok(radarPing.result !== null, "Radar ping should succeed for active detective");

  const roadblock = controller.deployRoadblock("sock_detRed", chosenMove.toStation);
  assert.equal(roadblock.valid, true, "Roadblock deployment should succeed");

  // Detective Red takes a legal move
  const detRedMoves = controller.engine.getLegalMoves("detective_red");
  assert.ok(detRedMoves.length > 0, "Detective Red should have legal moves");
  const detMove = detRedMoves[0];
  const initialXTaxi = controller.engine.state.players.misterX.tickets.taxi;

  const detRes = controller.executeMove("sock_detRed", {
    playerRole: "detective_red",
    toStation: detMove.toStation,
    ticketUsed: detMove.ticketUsed
  });
  assert.equal(detRes.valid, true, "Detective move should succeed");

  if (detMove.ticketUsed === "taxi") {
    assert.equal(
      controller.engine.state.players.misterX.tickets.taxi,
      initialXTaxi + 1,
      "Used detective taxi ticket must surrender to Mister X"
    );
  }

  controller.destroy();
});

test("Shared Scratchpad & Detective Squad isolation rules", () => {
  const rm = new RoomManager();
  const room = rm.createRoom("sock_x", "p_x", "Moriarty", {
    cityId: "london",
    difficulty: "classic",
    detectiveCount: 5,
    turnTimeLimitSeconds: 60,
    tacticalMode: false,
    maxRounds: 24
  });

  rm.joinRoom(room.roomCode, "sock_det1", "p_1", "Lestrade");
  rm.joinRoom(room.roomCode, "sock_det2", "p_2", "Gregson");
  rm.joinRoom(room.roomCode, "sock_spec", "p_3", "Watcher");
  rm.claimRole(room.roomCode, "sock_spec", "spectator");

  // Verify recipient isolation helper logic
  const detectiveAndSpectatorSockets: string[] = [];
  room.players.forEach((session, sId) => {
    if (session.claimedRole !== "misterX") {
      detectiveAndSpectatorSockets.push(sId);
    }
  });

  assert.equal(detectiveAndSpectatorSockets.includes("sock_x"), false, "Mister X must never receive detective squad syncs");
  assert.equal(detectiveAndSpectatorSockets.includes("sock_det1"), true);
  assert.equal(detectiveAndSpectatorSockets.includes("sock_det2"), true);
  assert.equal(detectiveAndSpectatorSockets.includes("sock_spec"), true);
});

test("Roles are frozen after match start (no mid-game Mister X hijack)", () => {
  const rm = new RoomManager();
  const room = rm.createRoom("sock_x", "p_x", "Moriarty", {
    cityId: "london",
    difficulty: "classic",
    detectiveCount: 5,
    turnTimeLimitSeconds: 0,
    tacticalMode: false,
    maxRounds: 24
  });
  rm.joinRoom(room.roomCode, "sock_det", "p_d", "Lestrade");
  room.status = "in_game";

  rm.leaveRoom("sock_x"); // Mister X's slot is freed in the lobby
  const claim = rm.claimRole(room.roomCode, "sock_det", "misterX");
  assert.equal(claim.success, false, "Mid-game claim must be rejected");
  assert.notEqual(room.players.get("sock_det")?.claimedRole, "misterX");
  assert.equal(rm.updateConfig(room.roomCode, "sock_det", { cityId: "paris" }), false);

  const late = rm.joinRoom(room.roomCode, "sock_late", "p_l", "Late");
  assert.equal(late.session?.claimedRole, "spectator", "Late joiners spectate");
});

test("Controller derives viewer role from frozen assignments and bots out leavers", () => {
  const controller = new GameSessionController(
    "ROOM77",
    {
      cityId: "london",
      difficulty: "classic",
      detectiveCount: 5,
      turnTimeLimitSeconds: 0,
      tacticalMode: false,
      maxRounds: 24
    },
    new Map([
      ["misterX", "sock_x"],
      ["detective_red", "sock_d"]
    ]) as any,
    new Map([
      ["sock_x", "X"],
      ["sock_d", "D"]
    ]),
    { onStateUpdate: () => {} }
  );

  assert.equal(controller.getViewerRole("sock_x"), "misterX");
  assert.equal(controller.getViewerRole("sock_d"), "detective_red");
  assert.equal(controller.getViewerRole("sock_unknown"), "spectator");

  controller.releaseSocket("sock_x");
  assert.equal(controller.botRoles.has("misterX"), true, "Disconnected Mister X becomes a bot");
  assert.equal(controller.getViewerRole("sock_x"), "spectator", "Leaver gets no privileged view");
  controller.destroy();
});

test("Sanitized payload never leaks Mister X hidden stations or decoyed tickets", () => {
  const engine = new GameEngine(LONDON_MAP);
  engine.createNewGame(
    {
      cityId: "london",
      difficulty: "classic",
      detectiveCount: 2,
      maxRounds: 24,
      tacticalMode: true
    },
    { misterX: 1, detectives: [100, 101] }
  );
  const start = engine.state.players.misterX.station;
  const move = engine.getLegalMoves("misterX").find((m) => m.ticketUsed === "taxi")!;
  engine.state.tacticalState!.activeDecoyNextMove = true;
  const res = engine.executeMove({
    playerRole: "misterX",
    toStation: move.toStation,
    ticketUsed: "taxi"
  });
  assert.equal(res.valid, true);

  const raw = JSON.stringify(StateSanitizer.sanitize(engine, "detective_red"));
  const state = JSON.parse(raw);
  const rec = state.moveHistory.find((r: any) => r.playerRole === "misterX");
  assert.equal(rec.fromStation, -1);
  assert.equal(rec.toStation, -1);
  assert.equal(rec.ticketUsed, state.misterXTravelLog[0].ticketUsed, "History must match the public (decoyed) ticket");
  assert.equal(rec.ticketUsed, "bus", "Decoy disguises taxi as bus");
  assert.equal(state.players.misterX.station, -1);
  assert.notEqual(start, -1);
});

test("Input validation rejects malformed moves, pins and config", async () => {
  const v = await import("../security/validation.ts");
  assert.equal(v.parseMoveAction(null), null);
  assert.equal(v.parseMoveAction({ playerRole: "hacker", toStation: 5, ticketUsed: "taxi" }), null);
  assert.equal(v.parseMoveAction({ playerRole: "misterX", toStation: "5", ticketUsed: "taxi" }), null);
  assert.ok(v.parseMoveAction({ playerRole: "misterX", toStation: 5, ticketUsed: "taxi" }));

  assert.equal(v.parsePins({ 5: { type: "evil" } }), null);
  assert.ok(v.parsePins({ 5: { type: "note", note: "x".repeat(999) } })![5].note!.length <= v.MAX_NOTE_LENGTH);

  const cfg = v.sanitizeConfigPatch({ cityId: "mars", maxRounds: 9999, evil: true, tacticalMode: true });
  assert.deepEqual(cfg, { maxRounds: 40, tacticalMode: true });

  assert.equal(v.sanitizeChatText("   "), null);
  assert.equal(v.sanitizeChatText("x".repeat(1000))!.length, v.MAX_CHAT_LENGTH);

  const rl = new v.RateLimiter(2, 1000);
  assert.equal(rl.allow("a", 0), true);
  assert.equal(rl.allow("a", 1), true);
  assert.equal(rl.allow("a", 2), false);
  assert.equal(rl.allow("a", 1500), true);
});
