"use client";

import React from "react";
import {
  Radio, RefreshCw, Bot, Users, MapPin, Sliders, ShieldAlert, PlaySquare,
  Globe, Clock, LogOut, BookOpen, Volume2, VolumeX, Settings, Home
} from "lucide-react";
import type { CityMapData } from "@scotland-yard/common";
import type { Difficulty, GameMode } from "../../lib/localMatch";

interface GameHeaderProps {
  activeMap: CityMapData;
  hasMoves: boolean;
  isReplayActive: boolean;
  onToggleReplay: () => void;
  selectedCityId: string;
  onCityChange: (cityId: string) => void;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  tacticalModeEnabled: boolean;
  onToggleTactical: () => void;
  gameMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  roomCode: string | null;
  myRole: string | null;
  timerSeconds: number | null;
  onLeaveRoom: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onMenu: () => void;
  onNewMatch: () => void;
  onOpenRulebook: () => void;
  onOpenSettings: () => void;
}

/** Top header bar of the game screen. */
export const GameHeader: React.FC<GameHeaderProps> = (p) => (
  <header className="z-10 h-16 bg-noir-900/95 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between shadow-lg">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center shadow-lg">
        <Radio className="w-5 h-5 text-purple-400 animate-pulse" />
      </div>
      <div>
        <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
          SCOTLAND YARD
          <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
            Field Operation
          </span>
        </h1>
        <p className="text-xs text-slate-400">
          {p.activeMap.name} • {p.activeMap.stations.length} Stations • {p.activeMap.edges.length} Routes
        </p>
      </div>
    </div>

    {/* Header Controls */}
    <div className="flex items-center gap-3">
      {/* Main Menu Button */}
      <button
        onClick={p.onMenu}
        className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        title="Return to Main Menu"
      >
        <Home className="w-3.5 h-3.5 text-purple-400" />
        <span>Menu</span>
      </button>
      {/* Replay Viewer Button (available when game is finished or moves exist) */}
      {p.hasMoves && (
        <button
          onClick={p.onToggleReplay}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-bold transition ${
            p.isReplayActive
              ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
              : "bg-slate-800 text-purple-300 border-purple-500/40 hover:bg-slate-700"
          }`}
          title="Toggle Post-Game Replay Viewer"
        >
          <PlaySquare className="w-3.5 h-3.5" />
          {p.isReplayActive ? "Exit Replay" : "Review Replay"}
        </button>
      )}

      {/* City Selector */}
      <div className="flex items-center bg-noir-850 px-2.5 py-1 rounded-xl border border-slate-700/60 text-xs">
        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
        <select
          value={p.selectedCityId}
          onChange={(e) => p.onCityChange(e.target.value)}
          className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
        >
          <option value="london" className="bg-noir-900 text-white">London (199 Classic)</option>
          <option value="paris" className="bg-noir-900 text-white">Paris (280 Intermediate)</option>
          <option value="newyork" className="bg-noir-900 text-white">New York (380 Expert)</option>
        </select>
      </div>

      {/* Difficulty Preset */}
      <div className="flex items-center bg-noir-850 px-2.5 py-1 rounded-xl border border-slate-700/60 text-xs">
        <Sliders className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
        <select
          value={p.difficulty}
          onChange={(e) => p.onDifficultyChange(e.target.value as Difficulty)}
          className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer capitalize"
        >
          <option value="casual" className="bg-noir-900 text-white">Casual</option>
          <option value="classic" className="bg-noir-900 text-white">Classic</option>
          <option value="hard" className="bg-noir-900 text-white">Hard / Expert</option>
        </select>
      </div>

      {/* Tactical Mode Toggle */}
      <button
        onClick={p.onToggleTactical}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition ${
          p.tacticalModeEnabled
            ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
        }`}
        title="Toggle Tactical Power-Ups"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        Tactical: {p.tacticalModeEnabled ? "ON" : "OFF"}
      </button>

      {/* Game Mode Selector */}
      <div className="flex items-center bg-noir-850 p-1 rounded-xl border border-slate-700/60">
        <button
          onClick={() => p.onSelectMode("single_player")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
            p.gameMode === "single_player"
              ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Hunt AI
        </button>
        <button
          onClick={() => p.onSelectMode("pass_and_play")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
            p.gameMode === "pass_and_play"
              ? "bg-slate-700 text-white shadow-md"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Pass &amp; Play
        </button>
        <button
          onClick={() => p.onSelectMode("multiplayer")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
            p.gameMode === "multiplayer"
              ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Online
        </button>
      </div>

      {/* Multiplayer Active Session Indicator */}
      {p.gameMode === "multiplayer" && p.roomCode && (
        <div className="flex items-center gap-2 bg-noir-850 px-3 py-1.5 rounded-xl border border-amber-500/40">
          <span className="text-[10px] uppercase font-bold text-amber-400">Room</span>
          <span className="font-mono font-bold text-xs text-white">{p.roomCode}</span>
          {p.myRole && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
              {p.myRole.replace("detective_", "")}
            </span>
          )}
          {p.timerSeconds !== null && (
            <span className="text-[10px] font-mono text-amber-300 font-bold flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> {p.timerSeconds}s
            </span>
          )}
          <button
            onClick={p.onLeaveRoom}
            className="p-1 text-slate-400 hover:text-rose-400 transition"
            title="Leave Multiplayer Match"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* New Game Button */}
      <button
        onClick={p.onNewMatch}
        className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        New Match
      </button>

      {/* Rulebook Field Manual */}
      <button
        onClick={p.onOpenRulebook}
        className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition"
        title="Field Rulebook (?)"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Manual</span>
      </button>

      {/* Audio Mute Quick Toggle */}
      <button
        onClick={p.onToggleMute}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        title="Toggle Mute (M)"
      >
        {p.isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
      </button>

      {/* Operation Settings Modal Toggle */}
      <button
        onClick={p.onOpenSettings}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
        title="Operation Settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>
    </div>
  </header>
);
