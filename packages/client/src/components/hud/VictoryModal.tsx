"use client";

import React from "react";
import type { WinInfo } from "@scotland-yard/common";
import { Trophy, Skull, RotateCcw, Eye } from "lucide-react";

interface VictoryModalProps {
  winInfo: WinInfo;
  onPlayAgain: () => void;
  onInspectBoard: () => void;
  onViewReplay?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winInfo,
  onPlayAgain,
  onInspectBoard,
  onViewReplay
}) => {
  const isDetectivesWin = winInfo.winner === "detectives";

  const getReasonText = () => {
    switch (winInfo.reason) {
      case "captured":
        return `Mister X was intercepted and arrested at round ${winInfo.finalRound}!`;
      case "mister_x_trapped":
        return "Mister X had all avenues of escape blocked with 0 legal moves!";
      case "rounds_exhausted":
        return "Mister X successfully evaded Scotland Yard across all 24 rounds!";
      case "detectives_stuck":
        return "Scotland Yard detectives exhausted all valid transit tickets!";
      default:
        return "Game concluded.";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-noir-900 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40 ${
            isDetectivesWin ? "bg-emerald-500" : "bg-purple-600"
          }`}
        />

        {/* Victory Icon Badge */}
        <div className="mx-auto mb-5 w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl border border-white/10 relative">
          {isDetectivesWin ? (
            <div className="w-full h-full rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-emerald-900/50 shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          ) : (
            <div className="w-full h-full rounded-3xl bg-gradient-to-br from-purple-600 to-fuchsia-800 flex items-center justify-center shadow-purple-900/50 shadow-lg">
              <Skull className="w-10 h-10 text-white" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black tracking-tight text-white mb-2">
          {isDetectivesWin ? "DETECTIVES WIN!" : "MISTER X WINS!"}
        </h2>
        <p className="text-sm text-slate-300 font-medium mb-6 max-w-sm mx-auto">
          {getReasonText()}
        </p>

        {/* Match Statistics Card */}
        <div className="bg-noir-950/80 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-around text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Final Round
            </span>
            <span className="text-xl font-mono font-bold text-white">
              {winInfo.finalRound} / 24
            </span>
          </div>

          <div className="w-px h-8 bg-slate-800" />

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Result Type
            </span>
            <span className="text-sm font-semibold capitalize text-amber-400">
              {winInfo.reason.replace(/_/g, " ")}
            </span>
          </div>

          {winInfo.capturingDetective && (
            <>
              <div className="w-px h-8 bg-slate-800" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Captor
                </span>
                <span className="text-sm font-bold capitalize text-emerald-400">
                  {winInfo.capturingDetective.replace("detective_", "")}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2.5">
          {onViewReplay && (
            <button
              onClick={onViewReplay}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 transition"
            >
              <Eye className="w-4 h-4" />
              Watch Full Match Replay & Mystery Route
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onInspectBoard}
              className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              Inspect Board
            </button>
            <button
              onClick={onPlayAgain}
              className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
