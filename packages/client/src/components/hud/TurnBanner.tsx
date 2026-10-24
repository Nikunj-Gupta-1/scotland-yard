"use client";

import React from "react";
import type { GameState, PlayerRole } from "@scotland-yard/common";
import { AlertCircle, Eye, Sparkles } from "lucide-react";

interface TurnBannerProps {
  gameState: GameState;
  surfacingRounds: number[];
  reachableCount: number;
}

export const TurnBanner: React.FC<TurnBannerProps> = ({
  gameState,
  surfacingRounds,
  reachableCount
}) => {
  const activeRole = gameState.activeRole;
  const activePlayer = gameState.players[activeRole];
  const isMisterX = activeRole === "misterX";
  const isSurfacingRound = surfacingRounds.includes(gameState.currentRound);
  const nextSurfacingRound = surfacingRounds.find((r) => r > gameState.currentRound);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-noir-900/95 border-b border-slate-800/80 text-xs">
      {/* Active Player Info */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400">Current Turn:</span>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isMisterX
                ? "bg-purple-500 animate-ping"
                : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span className="font-bold text-white text-sm">
            {activePlayer?.name || activeRole}
          </span>
          {gameState.doubleMoveActive && (
            <span className="flex items-center gap-1 bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              Double-Move (Part 2)
            </span>
          )}
        </div>
      </div>

      {/* Surfacing Alerts & Hints */}
      <div className="flex items-center gap-3">
        {isSurfacingRound ? (
          <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold px-3 py-1 rounded-full animate-bounce">
            <Eye className="w-3.5 h-3.5" />
            <span>SURFACING ROUND! Mister X location revealed on this move!</span>
          </div>
        ) : nextSurfacingRound ? (
          <div className="hidden md:flex items-center gap-1.5 text-slate-400">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Next reveal on Round{" "}
              <span className="font-mono font-bold text-slate-200">
                #{nextSurfacingRound}
              </span>{" "}
              (in {nextSurfacingRound - gameState.currentRound} turns)
            </span>
          </div>
        ) : null}

        <div className="text-slate-400 font-mono">
          <span className="text-emerald-400 font-bold">{reachableCount}</span>{" "}
          destinations available
        </div>
      </div>
    </div>
  );
};
