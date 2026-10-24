"use client";

import React, { useState } from "react";
import {
  Users,
  Copy,
  Check,
  Shield,
  Clock,
  Play,
  ArrowLeft,
  Crown,
  Eye,
  Settings2,
  Sparkles,
  MapPin,
  Bot
} from "lucide-react";
import type { GameConfig, PlayerRole } from "@scotland-yard/common";
import type { PublicLobbyState } from "../../hooks/useGameSocket.ts";

interface LobbyViewProps {
  lobbyState: PublicLobbyState;
  myRole: PlayerRole | "spectator" | null;
  myRoles?: PlayerRole[];
  isHost: boolean;
  onClaimRole: (role: PlayerRole | "spectator") => void;
  onUpdateConfig: (config: Partial<GameConfig>) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

const DETECTIVE_ROLES: { role: PlayerRole; name: string; color: string; badge: string }[] = [
  { role: "detective_red", name: "Red CID", color: "border-red-500/40 bg-red-950/20 text-red-300", badge: "bg-red-500" },
  { role: "detective_green", name: "Green Yard", color: "border-emerald-500/40 bg-emerald-950/20 text-emerald-300", badge: "bg-emerald-500" },
  { role: "detective_yellow", name: "Yellow Branch", color: "border-amber-500/40 bg-amber-950/20 text-amber-300", badge: "bg-amber-500" },
  { role: "detective_blue", name: "Blue Squad", color: "border-sky-500/40 bg-sky-950/20 text-sky-300", badge: "bg-sky-500" },
  { role: "detective_purple", name: "Purple Interpol", color: "border-purple-500/40 bg-purple-950/20 text-purple-300", badge: "bg-purple-500" }
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  lobbyState,
  myRole,
  myRoles = [],
  isHost,
  onClaimRole,
  onUpdateConfig,
  onStartGame,
  onLeaveRoom
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(lobbyState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}?join=${lobbyState.roomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const misterXHolder = lobbyState.roleAssignments.misterX;
  const canStart = !!misterXHolder;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onLeaveRoom}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition text-slate-300"
            title="Leave Lobby"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Investigation Room
              </span>
              {isHost && (
                <span className="text-xs uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Host
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-1">
              Multiplayer Briefing Room
            </h1>
          </div>
        </div>

        {/* Room Code Card */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/40 rounded-xl px-4 py-2.5 shadow-lg shadow-black/40">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
              Room Code
            </div>
            <div className="text-2xl font-black font-mono tracking-widest text-white">
              {lobbyState.roomCode}
            </div>
          </div>
          <div className="flex flex-col gap-1 border-l border-slate-700 pl-3">
            <button
              onClick={copyRoomCode}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs"
              title="Copy Code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Code</span>
            </button>
            <button
              onClick={copyInviteLink}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs"
              title="Copy Invite Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Link</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 flex-1">
        {/* Left 2 Cols: Role Slots */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mister X Slot */}
          <div className="bg-slate-900/60 border-2 border-purple-500/40 rounded-2xl p-5 relative overflow-hidden backdrop-blur shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-purple-300 font-black text-2xl shadow-inner">
                  X
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-wide">
                      Mister X
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      The Fugitive
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Travels invisibly through the city, surfacing only at rounds 3, 8, 13, 18, 24.
                  </p>
                  <div className="mt-2 text-sm font-semibold flex items-center gap-2">
                    <span className="text-slate-500">Operative:</span>
                    {misterXHolder ? (
                      <span className="text-purple-300 font-bold bg-purple-900/40 px-2.5 py-0.5 rounded border border-purple-700/50">
                        {misterXHolder} {myRole === "misterX" ? "(You)" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Unassigned (Required)</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onClaimRole("misterX")}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition shadow-lg ${
                  myRole === "misterX"
                    ? "bg-purple-900/60 text-purple-200 border border-purple-400 hover:bg-rose-900/60 hover:text-white"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40"
                }`}
              >
                {myRole === "misterX" ? "Release Mister X" : "Play as Mister X"}
              </button>
            </div>
          </div>

          {/* Detective Roles */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold text-white">Scotland Yard Detective Squad</h2>
              </div>
              <span className="text-xs text-slate-400">
                You can control multiple detectives from your device
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {DETECTIVE_ROLES.map((det) => {
                const holder = lobbyState.roleAssignments[det.role];
                const isClaimedByMe = (myRoles && myRoles.includes(det.role)) || myRole === det.role;

                return (
                  <div
                    key={det.role}
                    className={`rounded-xl border p-3 flex flex-col justify-between transition ${
                      isClaimedByMe
                        ? "border-amber-400 bg-amber-950/20 ring-1 ring-amber-400"
                        : holder
                        ? "border-slate-700 bg-slate-900/80"
                        : "border-slate-800/80 bg-slate-950/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${det.badge} shadow-sm`} />
                          <span className="font-semibold text-sm text-slate-200">{det.name}</span>
                        </div>
                        {holder ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/50">
                            {isClaimedByMe ? "Your Squad" : "Claimed"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            <Bot className="w-3 h-3" /> Bot
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-xs">
                        {holder ? (
                          <div className="text-slate-300 font-medium truncate">
                            {holder} {isClaimedByMe ? "(You)" : ""}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic">Available slot</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3">
                      {isClaimedByMe ? (
                        <button
                          onClick={() => onClaimRole(det.role)}
                          className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-rose-500/20 text-xs font-bold text-amber-300 hover:text-rose-300 border border-amber-500/40 hover:border-rose-500/40 transition"
                          title="Click to release control of this detective"
                        >
                          ✓ Controlled (Release)
                        </button>
                      ) : !holder ? (
                        <button
                          onClick={() => onClaimRole(det.role)}
                          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-xs font-semibold text-slate-200 hover:text-white transition border border-slate-700 hover:border-emerald-500"
                        >
                          + Control Detective
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spectator Option */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm font-semibold text-slate-200">Spectator Mode</div>
                <div className="text-xs text-slate-400">Watch the investigation live without controlling a detective.</div>
              </div>
            </div>
            {myRole !== "spectator" ? (
              <button
                onClick={() => onClaimRole("spectator")}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition"
              >
                Join as Spectator
              </button>
            ) : (
              <span className="text-xs font-bold text-amber-400">Spectating</span>
            )}
          </div>
        </div>

        {/* Right Col: Match Configuration & Start Controls */}
        <div className="space-y-6">
          {/* Match Settings Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Match Directives</h2>
            </div>

            {/* City Selection */}
            <div className="space-y-2 mb-4">
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Investigation City
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "london", label: "London", tag: "Classic 199" },
                  { id: "paris", label: "Paris", tag: "280 Nodes" },
                  { id: "newyork", label: "New York", tag: "380 Nodes" }
                ].map((city) => (
                  <button
                    key={city.id}
                    disabled={!isHost}
                    onClick={() => onUpdateConfig({ cityId: city.id as any })}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      lobbyState.config.cityId === city.id
                        ? "border-amber-400 bg-amber-950/30 text-amber-300 font-bold shadow-md shadow-amber-900/20"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    } ${!isHost ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    <div className="text-sm font-semibold">{city.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{city.tag}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="space-y-2 mb-4">
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["casual", "classic", "hard"].map((diff) => (
                  <button
                    key={diff}
                    disabled={!isHost}
                    onClick={() => onUpdateConfig({ difficulty: diff as any })}
                    className={`py-1.5 rounded-lg border text-xs capitalize transition ${
                      lobbyState.config.difficulty === diff
                        ? "border-amber-400 bg-amber-950/30 text-amber-300 font-bold"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    } ${!isHost ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactical Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Tactical Power-Ups</div>
                  <div className="text-[10px] text-slate-500">Roadblocks, Radars, and Decoys</div>
                </div>
              </div>
              <input
                type="checkbox"
                disabled={!isHost}
                checked={lobbyState.config.tacticalMode}
                onChange={(e) => onUpdateConfig({ tacticalMode: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>

            {/* Turn Timer */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Turn Timer
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { val: 0, label: "None" },
                  { val: 30, label: "30s" },
                  { val: 60, label: "60s" },
                  { val: 90, label: "90s" }
                ].map((timer) => (
                  <button
                    key={timer.val}
                    disabled={!isHost}
                    onClick={() => onUpdateConfig({ turnTimeLimitSeconds: timer.val })}
                    className={`py-1.5 rounded-lg border text-xs transition ${
                      lobbyState.config.turnTimeLimitSeconds === timer.val
                        ? "border-amber-400 bg-amber-950/30 text-amber-300 font-bold"
                        : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700"
                    } ${!isHost ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    {timer.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Roster & Start Button */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold text-white">
                  Connected Operatives ({lobbyState.players.length})
                </span>
              </div>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {lobbyState.players.map((p) => (
                <div
                  key={p.playerId}
                  className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60"
                >
                  <div className="flex items-center gap-1.5">
                    {p.isHost && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="font-semibold text-slate-200">{p.playerName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {p.claimedRole.replace("detective_", "")}
                  </span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                disabled={!canStart}
                onClick={onStartGame}
                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-xl ${
                  canStart
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 cursor-pointer"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                {canStart ? "Start Match Now" : "Waiting for Mister X..."}
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 italic">
                Waiting for the host to launch the operation...
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
