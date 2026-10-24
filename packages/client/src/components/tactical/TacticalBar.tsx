"use client";

import React from "react";
import type { PlayerRole, TacticalState } from "@scotland-yard/common";
import { ShieldAlert, Radio, Ghost, Ban } from "lucide-react";

interface TacticalBarProps {
  activeRole: PlayerRole;
  tacticalState: TacticalState;
  targetingMode: "none" | "roadblock" | "radar";
  onSetTargetingMode: (mode: "none" | "roadblock" | "radar") => void;
  onActivateDecoy: () => void;
  lastRadarResult?: { stationId: number; detected: boolean } | null;
}

export const TacticalBar: React.FC<TacticalBarProps> = ({
  activeRole,
  tacticalState,
  targetingMode,
  onSetTargetingMode,
  onActivateDecoy,
  lastRadarResult
}) => {
  const isMisterX = activeRole === "misterX";

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Radar Result Toast */}
      {lastRadarResult && (
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl border animate-in fade-in slide-in-from-bottom-2 ${
            lastRadarResult.detected
              ? "bg-red-950/90 text-red-300 border-red-500/60 shadow-red-900/50"
              : "bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-emerald-900/50"
          }`}
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>
            {lastRadarResult.detected
              ? `🚨 SIGNAL DETECTED! Mister X is within 2 hops of Station #${lastRadarResult.stationId}!`
              : `✓ AREA CLEAR. No signal detected within 2 hops of Station #${lastRadarResult.stationId}.`}
          </span>
        </div>
      )}

      {/* Main Tactical Action Buttons */}
      <div className="flex items-center gap-2 bg-noir-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-2 border-r border-slate-800">
          Tactical Tools
        </span>

        {!isMisterX ? (
          <>
            {/* Deploy Police Roadblock */}
            <button
              onClick={() =>
                onSetTargetingMode(targetingMode === "roadblock" ? "none" : "roadblock")
              }
              disabled={tacticalState.detectiveRoadblocksRemaining <= 0}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition ${
                targetingMode === "roadblock"
                  ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30 animate-pulse"
                  : tacticalState.detectiveRoadblocksRemaining > 0
                  ? "bg-noir-850 hover:bg-slate-800 text-amber-400 border border-amber-500/40"
                  : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
              }`}
              title="Click then select a station on board to block for 2 rounds"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Roadblock</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono">
                {tacticalState.detectiveRoadblocksRemaining}
              </span>
            </button>

            {/* Informant Radar Ping */}
            <button
              onClick={() =>
                onSetTargetingMode(targetingMode === "radar" ? "none" : "radar")
              }
              disabled={tacticalState.detectiveRadarPingsRemaining <= 0}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition ${
                targetingMode === "radar"
                  ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30 animate-pulse"
                  : tacticalState.detectiveRadarPingsRemaining > 0
                  ? "bg-noir-850 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40"
                  : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
              }`}
              title="Click then select a station to scan for Mister X presence (2-hop radius)"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Radar Ping</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono">
                {tacticalState.detectiveRadarPingsRemaining}
              </span>
            </button>
          </>
        ) : (
          /* Mister X Decoy / Phantom Ticket */
          <button
            onClick={onActivateDecoy}
            disabled={tacticalState.misterXDecoysRemaining <= 0 || tacticalState.activeDecoyNextMove}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition ${
              tacticalState.activeDecoyNextMove
                ? "bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/40 animate-pulse"
                : tacticalState.misterXDecoysRemaining > 0
                ? "bg-noir-850 hover:bg-slate-800 text-fuchsia-300 border border-fuchsia-500/40"
                : "bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed"
            }`}
            title="Disguises transit mode on your next move in the public travel log"
          >
            <Ghost className="w-3.5 h-3.5" />
            <span>
              {tacticalState.activeDecoyNextMove ? "Decoy Armed" : "Arm Decoy"}
            </span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono">
              {tacticalState.misterXDecoysRemaining}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
