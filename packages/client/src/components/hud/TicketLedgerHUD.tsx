"use client";

import React from "react";
import type { PlayerRole, PlayerState } from "@scotland-yard/common";
import { Car, Bus, Train, ShieldAlert, Sparkles, User, Shield, HelpCircle } from "lucide-react";

interface TicketLedgerHUDProps {
  players: Record<PlayerRole, PlayerState>;
  activeRole: PlayerRole;
  turnOrder: PlayerRole[];
  viewerRole?: PlayerRole | "spectator" | "detectives";
  isSurfaced?: boolean;
  isGameOver?: boolean;
  onSelectPlayer?: (role: PlayerRole) => void;
}

const DETECTIVE_THEMES: Record<
  string,
  { bg: string; border: string; text: string; badge: string; name: string }
> = {
  detective_red: {
    bg: "bg-red-950/40",
    border: "border-red-500/50",
    text: "text-red-400",
    badge: "bg-red-500 text-white",
    name: "Red CID"
  },
  detective_green: {
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/50",
    text: "text-emerald-400",
    badge: "bg-emerald-500 text-white",
    name: "Green Yard"
  },
  detective_yellow: {
    bg: "bg-amber-950/40",
    border: "border-amber-500/50",
    text: "text-amber-400",
    badge: "bg-amber-500 text-black",
    name: "Yellow Branch"
  },
  detective_blue: {
    bg: "bg-blue-950/40",
    border: "border-blue-500/50",
    text: "text-blue-400",
    badge: "bg-blue-500 text-white",
    name: "Blue Squad"
  },
  detective_purple: {
    bg: "bg-purple-950/40",
    border: "border-purple-500/50",
    text: "text-purple-400",
    badge: "bg-purple-500 text-white",
    name: "Purple Interpol"
  }
};

export const TicketLedgerHUD: React.FC<TicketLedgerHUDProps> = ({
  players,
  activeRole,
  turnOrder,
  viewerRole = "detectives",
  isSurfaced = false,
  isGameOver = false,
  onSelectPlayer
}) => {
  const activePlayer = players[activeRole];
  if (!activePlayer) return null;

  const isMisterXActive = activeRole === "misterX";
  const canSeeMisterXStation =
    viewerRole === "misterX" || isSurfaced || isGameOver;

  const misterXStationLabel = canSeeMisterXStation && players.misterX?.station > 0
    ? `Station #${players.misterX.station}`
    : "Station: ??? (Secret)";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 p-2.5 bg-noir-900/95 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-2xl">
      {/* 1. Hero Card: Active Operative Focus */}
      <div
        className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all ${
          isMisterXActive
            ? "bg-purple-950/70 border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-900/40"
            : `${DETECTIVE_THEMES[activeRole]?.bg || "bg-slate-900"} ${
                DETECTIVE_THEMES[activeRole]?.border || "border-slate-700"
              } ring-2 ring-amber-400/40 shadow-lg`
        }`}
      >
        <div className="flex items-center gap-2.5">
          {/* Avatar Icon */}
          {isMisterXActive ? (
            <div className="w-9 h-9 rounded-lg bg-purple-900/80 border border-purple-500/70 flex items-center justify-center font-black text-purple-200 text-base shadow-inner">
              X
            </div>
          ) : (
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner ${
                DETECTIVE_THEMES[activeRole]?.badge || "bg-slate-800 text-white"
              }`}
            >
              <Shield className="w-5 h-5 fill-current" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">
                {activePlayer.name}
              </span>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black animate-pulse">
                Active Turn
              </span>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
              {isMisterXActive ? (
                <span className={canSeeMisterXStation ? "text-purple-300" : "text-amber-400/80"}>
                  {misterXStationLabel}
                </span>
              ) : (
                <span className="text-emerald-400">
                  Station #{activePlayer.station}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Active Player Ticket Ledger */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-800/80 font-mono font-bold text-xs">
          {/* Taxi */}
          <div
            className="flex items-center gap-1 bg-amber-500/15 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/30 shadow-sm"
            title="Taxi Tickets (Short hops)"
          >
            <Car className="w-3.5 h-3.5" />
            <span>{activePlayer.tickets.taxi}</span>
          </div>

          {/* Bus */}
          <div
            className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/30 shadow-sm"
            title="Bus Tickets (Arterial routes)"
          >
            <Bus className="w-3.5 h-3.5" />
            <span>{activePlayer.tickets.bus}</span>
          </div>

          {/* Underground */}
          <div
            className="flex items-center gap-1 bg-red-500/15 text-red-400 px-2 py-1 rounded-lg border border-red-500/30 shadow-sm"
            title="Underground Tickets (Rapid Tube lines)"
          >
            <Train className="w-3.5 h-3.5" />
            <span>{activePlayer.tickets.underground}</span>
          </div>

          {/* Mister X Special Tickets */}
          {isMisterXActive && (
            <>
              {/* Black Ticket */}
              <div
                className="flex items-center gap-1 bg-slate-950 text-purple-300 px-2 py-1 rounded-lg border border-purple-500/50 shadow-sm"
                title="Black Wildcard Tickets (Stealth travel & Ferries)"
              >
                <span className="text-[10px] font-black uppercase">BLK</span>
                <span>{activePlayer.tickets.black}</span>
              </div>

              {/* 2x Double Move */}
              <div
                className="flex items-center gap-1 bg-purple-900/30 text-pink-400 px-2 py-1 rounded-lg border border-pink-500/40 shadow-sm"
                title="Double Move Cards (2 consecutive moves)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{activePlayer.tickets.doubleMove}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Compact Squad Ticket Reserve Bar */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mr-1 hidden sm:inline">
          Squad:
        </span>
        {turnOrder
          .filter((role) => role !== activeRole)
          .map((role) => {
            const p = players[role];
            if (!p) return null;
            const isX = role === "misterX";
            const theme = DETECTIVE_THEMES[role];

            return (
              <button
                key={role}
                onClick={() => onSelectPlayer?.(role)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-mono transition ${
                  isX
                    ? "bg-purple-950/30 border-purple-500/30 text-purple-300 hover:border-purple-400"
                    : `${theme?.bg || "bg-slate-900"} ${
                        theme?.border || "border-slate-800"
                      } ${theme?.text || "text-slate-300"} hover:border-slate-600`
                }`}
                title={`Click to inspect ${p.name}`}
              >
                <span className="font-bold">
                  {isX ? "X" : role.replace("detective_", "").slice(0, 1).toUpperCase()}
                </span>
                <span className="text-slate-400 text-[10px]">
                  ({p.tickets.taxi + p.tickets.bus + p.tickets.underground})
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
};
