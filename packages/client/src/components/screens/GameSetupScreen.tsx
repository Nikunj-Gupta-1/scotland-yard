"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Play,
  MapPin,
  Sliders,
  ShieldAlert,
  Users,
  Bot,
  Sparkles,
  Shield,
  UserCheck
} from "lucide-react";
import type { GameConfig, PlayerRole } from "@scotland-yard/common";

export interface LocalMatchSetup {
  cityId: "london" | "paris" | "newyork";
  difficulty: "casual" | "classic" | "hard";
  tacticalMode: boolean;
  gameMode: "single_player" | "play_as_x" | "pass_and_play";
  playerCount: number;
  playerNames: string[];
  roleAssignments: Record<PlayerRole, number>; // role -> player index (0..N-1, or -1 for AI)
}

interface GameSetupScreenProps {
  onBack: () => void;
  onLaunchGame: (setup: LocalMatchSetup) => void;
}

const DETECTIVE_ROLES: { role: PlayerRole; name: string; color: string; badge: string }[] = [
  { role: "detective_red", name: "Red CID", color: "border-red-500/40 bg-red-950/20 text-red-300", badge: "bg-red-500" },
  { role: "detective_green", name: "Green Yard", color: "border-emerald-500/40 bg-emerald-950/20 text-emerald-300", badge: "bg-emerald-500" },
  { role: "detective_yellow", name: "Yellow Branch", color: "border-amber-500/40 bg-amber-950/20 text-amber-300", badge: "bg-amber-500" },
  { role: "detective_blue", name: "Blue Squad", color: "border-sky-500/40 bg-sky-950/20 text-sky-300", badge: "bg-sky-500" },
  { role: "detective_purple", name: "Purple Interpol", color: "border-purple-500/40 bg-purple-950/20 text-purple-300", badge: "bg-purple-500" }
];

export const GameSetupScreen: React.FC<GameSetupScreenProps> = ({
  onBack,
  onLaunchGame
}) => {
  const [cityId, setCityId] = useState<"london" | "paris" | "newyork">("london");
  const [difficulty, setDifficulty] = useState<"casual" | "classic" | "hard">("classic");
  const [tacticalMode, setTacticalMode] = useState(true);
  const [gameMode, setGameMode] = useState<"single_player" | "play_as_x" | "pass_and_play">("single_player");

  const [playerCount, setPlayerCount] = useState(1);
  const [playerNames, setPlayerNames] = useState<string[]>([
    "Player 1",
    "Player 2",
    "Player 3",
    "Player 4",
    "Player 5",
    "Player 6"
  ]);

  // Role assignments: player index (0..5), or -1 for AI
  const [roleAssignments, setRoleAssignments] = useState<Record<PlayerRole, number>>({
    misterX: -1, // AI by default in single player
    detective_red: 0,
    detective_green: 0,
    detective_yellow: 0,
    detective_blue: 0,
    detective_purple: 0
  });

  const handleGameModeChange = (mode: "single_player" | "play_as_x" | "pass_and_play") => {
    setGameMode(mode);
    if (mode === "single_player") {
      setPlayerCount(1);
      setRoleAssignments({
        misterX: -1,
        detective_red: 0,
        detective_green: 0,
        detective_yellow: 0,
        detective_blue: 0,
        detective_purple: 0
      });
    } else if (mode === "play_as_x") {
      setPlayerCount(1);
      setRoleAssignments({
        misterX: 0,
        detective_red: -1,
        detective_green: -1,
        detective_yellow: -1,
        detective_blue: -1,
        detective_purple: -1
      });
    } else {
      // Pass and Play: default 2 players
      setPlayerCount(2);
      setRoleAssignments({
        misterX: 0,
        detective_red: 1,
        detective_green: 1,
        detective_yellow: 1,
        detective_blue: 1,
        detective_purple: 1
      });
    }
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    // Distribute roles sensibly across count
    const next = { ...roleAssignments };
    if (gameMode === "pass_and_play") {
      next.misterX = 0;
      const detPlayers = count > 1 ? count - 1 : 1;
      DETECTIVE_ROLES.forEach((d, idx) => {
        next[d.role] = count > 1 ? 1 + (idx % detPlayers) : 0;
      });
    }
    setRoleAssignments(next);
  };

  const cycleRoleAssignment = (role: PlayerRole) => {
    setRoleAssignments((prev) => {
      const current = prev[role];
      // Cycle from -1 (AI) through 0..(playerCount - 1)
      let nextVal = current + 1;
      if (nextVal >= playerCount) {
        nextVal = -1; // back to AI
      }
      return { ...prev, [role]: nextVal };
    });
  };

  const handleLaunch = () => {
    onLaunchGame({
      cityId,
      difficulty,
      tacticalMode,
      gameMode,
      playerCount,
      playerNames: playerNames.slice(0, playerCount),
      roleAssignments
    });
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8">
      {/* Top Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition text-slate-300"
            title="Return to Title"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
              Investigation Directives
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Pre-Mission Setup
            </h1>
          </div>
        </div>

        <button
          onClick={handleLaunch}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Investigation</span>
        </button>
      </header>

      {/* Main Form Grid */}
      <main className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 flex-1">
        {/* Left 2 Cols: Mode, City, Rules */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Game Mode Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-3">
              1. Investigation Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "single_player",
                  title: "Hunt AI Mister X",
                  desc: "You control all 5 detectives against an evasive AI fugitive."
                },
                {
                  id: "play_as_x",
                  title: "Play as Mister X",
                  desc: "Slip through the city in stealth against automated police AI."
                },
                {
                  id: "pass_and_play",
                  title: "Pass & Play Hotseat",
                  desc: "Play locally with friends on this device with turn shields."
                }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleGameModeChange(m.id as any)}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                    gameMode === m.id
                      ? "border-amber-400 bg-amber-950/20 text-white ring-1 ring-amber-400"
                      : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="font-bold text-sm text-white mb-1">{m.title}</div>
                  <div className="text-xs text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. City Map Selector */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur">
            <label className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-3">
              2. Target City
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "london", label: "London", tag: "Classic 199 Stations", diff: "Standard" },
                { id: "paris", label: "Paris", tag: "280 Stations & Seine", diff: "Intermediate" },
                { id: "newyork", label: "New York", tag: "380 Stations & Grid", diff: "Expert" }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCityId(c.id as any)}
                  className={`p-3.5 rounded-xl border text-center transition ${
                    cityId === c.id
                      ? "border-purple-500 bg-purple-950/30 text-white font-bold shadow-lg shadow-purple-950/40"
                      : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-sm text-white">{c.label}</div>
                  <div className="text-[11px] text-purple-300/80 mt-0.5">{c.tag}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Difficulty & Tactical Mode */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-2">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["casual", "classic", "hard"].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d as any)}
                    className={`py-2 rounded-lg border text-xs font-semibold capitalize transition ${
                      difficulty === d
                        ? "border-amber-400 bg-amber-950/30 text-amber-300 font-bold"
                        : "border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <label className="text-xs uppercase font-bold text-slate-400 tracking-wider block mb-2">
                Tactical Power-Ups
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs text-slate-300 font-semibold">
                  Roadblocks, Radar Pings & Decoys
                </span>
                <input
                  type="checkbox"
                  checked={tacticalMode}
                  onChange={(e) => setTacticalMode(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Operatives Assignment Matrix */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Squad Allocation</h3>
                <p className="text-[11px] text-slate-400">Assign who controls each operative</p>
              </div>
              {gameMode === "pass_and_play" && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Players:</span>
                  <select
                    value={playerCount}
                    onChange={(e) => handlePlayerCountChange(parseInt(e.target.value))}
                    className="bg-slate-800 text-white font-bold px-2 py-1 rounded border border-slate-700 focus:outline-none"
                  >
                    {[2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Operatives Assignment Grid */}
            <div className="space-y-2">
              {/* Mister X Assignment */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-purple-900/80 text-purple-300 flex items-center justify-center font-black text-xs">
                    X
                  </span>
                  <span className="text-xs font-bold text-white">Mister X</span>
                </div>
                <button
                  onClick={() => cycleRoleAssignment("misterX")}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold border border-slate-700 text-purple-300"
                >
                  {roleAssignments.misterX === -1
                    ? "Automated AI"
                    : playerNames[roleAssignments.misterX]}
                </button>
              </div>

              {/* 5 Detectives Assignment */}
              {DETECTIVE_ROLES.map((det) => {
                const assignedIdx = roleAssignments[det.role];
                const isAI = assignedIdx === -1;

                return (
                  <div
                    key={det.role}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${det.badge}`} />
                      <span className="text-xs font-semibold text-slate-200">{det.name}</span>
                    </div>
                    <button
                      onClick={() => cycleRoleAssignment(det.role)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold border border-slate-700 text-slate-200"
                    >
                      {isAI ? "Automated AI" : playerNames[assignedIdx]}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-500 italic pt-1">
              Click any operative tag above to cycle control between players and AI.
            </div>

            <button
              onClick={handleLaunch}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Operation</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
