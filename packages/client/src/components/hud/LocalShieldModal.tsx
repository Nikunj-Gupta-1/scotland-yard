"use client";

import React from "react";
import type { PlayerState } from "@scotland-yard/common";
import { PlayerRole } from "@scotland-yard/common";
import { EyeOff, UserCheck, Shield } from "lucide-react";

interface LocalShieldModalProps {
  player: PlayerState;
  onDismiss: () => void;
}

export const LocalShieldModal: React.FC<LocalShieldModalProps> = ({
  player,
  onDismiss
}) => {
  const isMisterX = player.role === "misterX";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-noir-950/98 backdrop-blur-xl p-6 text-center animate-in fade-in duration-200">
      <div className="max-w-md w-full flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-700/80 flex items-center justify-center mb-6 shadow-2xl">
          {isMisterX ? (
            <EyeOff className="w-10 h-10 text-purple-400 animate-pulse" />
          ) : (
            <Shield className="w-10 h-10 text-emerald-400" />
          )}
        </div>

        <span className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
          Pass & Play Handover
        </span>

        <h2 className="text-2xl font-black text-white mb-2">
          Pass Screen to {player.name}
        </h2>

        <p className="text-sm text-slate-400 mb-8 max-w-xs">
          {isMisterX
            ? "Mister X's turn! Make sure the detectives look away while you plot your escape."
            : `Detective's turn! Study the travel log and coordinate your search.`}
        </p>

        <button
          onClick={onDismiss}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-900/40 flex items-center justify-center gap-2 transition"
        >
          <UserCheck className="w-5 h-5" />
          I'm Ready - Show Board
        </button>
      </div>
    </div>
  );
};
