"use client";

import React, { useState } from "react";
import { Users, Plus, LogIn, X, Globe, Shield } from "lucide-react";
import type { GameConfig } from "@scotland-yard/common";

interface MultiplayerConnectModalProps {
  isOpen: boolean;
  initialRoomCode?: string;
  onClose: () => void;
  onCreateRoom: (hostName: string, config: Partial<GameConfig>) => Promise<any>;
  onJoinRoom: (roomCode: string, playerName: string) => Promise<any>;
}

export const MultiplayerConnectModal: React.FC<MultiplayerConnectModalProps> = ({
  isOpen,
  initialRoomCode = "",
  onClose,
  onCreateRoom,
  onJoinRoom
}) => {
  const [tab, setTab] = useState<"join" | "create">(initialRoomCode ? "join" : "join");
  const [playerName, setPlayerName] = useState("Agent");
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [selectedCity, setSelectedCity] = useState<"london" | "paris" | "newyork">("london");
  const [difficulty, setDifficulty] = useState<"casual" | "classic" | "hard">("classic");
  const [tacticalMode, setTacticalMode] = useState(true);
  const [turnTimer, setTurnTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg("Please enter an operative callsign.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    const res = await onCreateRoom(playerName.trim(), {
      cityId: selectedCity,
      difficulty,
      tacticalMode,
      turnTimeLimitSeconds: turnTimer,
      maxRounds: 24,
      detectiveCount: 5
    });
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to create room.");
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setErrorMsg("Please enter an operative callsign.");
      return;
    }
    if (!roomCodeInput.trim() || roomCodeInput.trim().length !== 6) {
      setErrorMsg("Please enter a valid 6-character room code.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    const res = await onJoinRoom(roomCodeInput.trim().toUpperCase(), playerName.trim());
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Room not found or unable to join.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Online Investigation</h2>
            <p className="text-xs text-slate-400">Real-time Scotland Yard multiplayer</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setTab("join");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === "join"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Join Room
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("create");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              tab === "create"
                ? "bg-purple-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Host Match
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Callsign Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Operative Callsign / Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Inspector Lestrade"
            maxLength={20}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-purple-500"
          />
        </div>

        {tab === "join" ? (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                6-Character Room Code
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. SCOT42"
                maxLength={6}
                className="w-full px-3 py-2.5 text-center font-mono font-bold tracking-widest text-lg rounded-xl bg-slate-950 border border-slate-700 text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition shadow-lg shadow-purple-900/40 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Connecting..." : "Enter Room"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">City Map</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "london", label: "London" },
                    { id: "paris", label: "Paris" },
                    { id: "newyork", label: "New York" }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCity(c.id as any)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold capitalize transition ${
                        selectedCity === c.id
                          ? "border-amber-400 bg-amber-950/40 text-amber-300"
                          : "border-slate-800 bg-slate-950 text-slate-400"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Difficulty</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["casual", "classic", "hard"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d as any)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold capitalize transition ${
                        difficulty === d
                          ? "border-amber-400 bg-amber-950/40 text-amber-300"
                          : "border-slate-800 bg-slate-950 text-slate-400"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300">Tactical Power-Ups</span>
                <input
                  type="checkbox"
                  checked={tacticalMode}
                  onChange={(e) => setTacticalMode(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Turn Timer</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { val: 0, label: "None" },
                    { val: 30, label: "30s" },
                    { val: 60, label: "60s" },
                    { val: 90, label: "90s" }
                  ].map((t) => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setTurnTimer(t.val)}
                      className={`py-1 rounded-lg border text-xs font-semibold transition ${
                        turnTimer === t.val
                          ? "border-amber-400 bg-amber-950/40 text-amber-300"
                          : "border-slate-800 bg-slate-950 text-slate-400"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition shadow-lg shadow-purple-900/40 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Establishing Operation..." : "Create Investigation Room"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
