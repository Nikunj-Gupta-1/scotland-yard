"use client";

import React, { useState } from "react";
import type { TicketType, TravelLogEntry } from "@scotland-yard/common";
import { Eye, Car, Bus, Train, ShieldAlert, Sparkles, ChevronDown, ChevronUp, FolderArchive, MapPin } from "lucide-react";

interface TravelLogHUDProps {
  currentRound: number;
  maxRounds: number;
  surfacingRounds: number[];
  travelLog: TravelLogEntry[];
  onSelectStation?: (stationId: number) => void;
}

const TICKET_CONFIG: Record<
  TicketType,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  taxi: {
    label: "TAXI",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/50",
    icon: <Car className="w-3.5 h-3.5" />
  },
  bus: {
    label: "BUS",
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/50",
    icon: <Bus className="w-3.5 h-3.5" />
  },
  underground: {
    label: "TUBE",
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/50",
    icon: <Train className="w-3.5 h-3.5" />
  },
  black: {
    label: "BLACK",
    bg: "bg-purple-500/25",
    text: "text-purple-300",
    border: "border-purple-500/60",
    icon: <ShieldAlert className="w-3.5 h-3.5" />
  },
  doubleMove: {
    label: "2x",
    bg: "bg-fuchsia-500/25",
    text: "text-fuchsia-300",
    border: "border-fuchsia-500/60",
    icon: <Sparkles className="w-3.5 h-3.5" />
  }
};

export const TravelLogHUD: React.FC<TravelLogHUDProps> = ({
  currentRound,
  maxRounds,
  surfacingRounds,
  travelLog,
  onSelectStation
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const roundNumbers = Array.from({ length: maxRounds }, (_, i) => i + 1);

  // Compute next surfacing round
  const nextSurfacingRound = surfacingRounds.find((r) => r >= currentRound);
  const turnsUntilReveal = nextSurfacingRound ? nextSurfacingRound - currentRound : null;

  return (
    <aside
      aria-label="Mister X Travel Log"
      className="w-full transition-all duration-300 select-none z-20 pointer-events-auto"
    >
      <div className="bg-noir-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2 shadow-2xl">
        {/* Case File Header / Drawer Toggle */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="flex items-center gap-2 group text-left focus:outline-none"
              title={isCollapsed ? "Expand Case File" : "Collapse Case File"}
            >
              <div className="p-1 rounded-md bg-purple-950/60 border border-purple-500/40 text-purple-300 group-hover:border-purple-400 transition">
                <FolderArchive className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200 group-hover:text-purple-300 transition flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                Case File // Mister X Travel Log
              </span>
              {isCollapsed ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            <span className="hidden sm:inline-block text-xs text-slate-500">
              • Reveals: {surfacingRounds.join(", ")}
            </span>

            {turnsUntilReveal !== null && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold hidden md:inline-block">
                {turnsUntilReveal === 0 ? "SURFACING THIS ROUND" : `Reveal in ${turnsUntilReveal} turns`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400 font-mono">
              Turn <span className="font-bold text-white">{currentRound}</span> of {maxRounds}
            </div>
            <button
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-700/60 bg-slate-800/40"
            >
              {isCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>

        {/* Collapsible Content: Horizontal Ribbon of Rounds */}
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 scrollbar-thin">
            {roundNumbers.map((round) => {
              const isSurfacing = surfacingRounds.includes(round);
              const isCurrent = round === currentRound;
              const isPast = round < currentRound;
              const entry = travelLog[round - 1];
              const isRevealed = entry?.revealedStation !== undefined && entry.revealedStation > 0;

              return (
                <div
                  key={round}
                  className={`flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-between p-1.5 border transition-all ${
                    isCurrent
                      ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/40 scale-105"
                      : isSurfacing
                      ? "bg-noir-850 border-amber-500/40"
                      : "bg-noir-950/80 border-slate-800/80"
                  }`}
                >
                  {/* Header: Round Number & Eye Indicator */}
                  <div className="w-full flex items-center justify-between px-1">
                    <span
                      className={`text-[10px] font-mono font-bold ${
                        isCurrent ? "text-purple-300" : "text-slate-400"
                      }`}
                    >
                      #{round}
                    </span>
                    {isSurfacing && (
                      <span title="Surfacing Round">
                        <Eye
                          className={`w-3 h-3 ${
                            isPast || isCurrent ? "text-amber-400" : "text-slate-600"
                          }`}
                        />
                      </span>
                    )}
                  </div>

                  {/* Center: Ticket or Revealed Station */}
                  <div className="flex flex-col items-center justify-center my-auto w-full">
                    {entry ? (
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`flex items-center justify-center w-7 h-7 rounded-lg border ${
                            TICKET_CONFIG[entry.ticketUsed]?.bg || "bg-slate-800"
                          } ${TICKET_CONFIG[entry.ticketUsed]?.border || "border-slate-700"} ${
                            TICKET_CONFIG[entry.ticketUsed]?.text || "text-slate-200"
                          }`}
                          title={TICKET_CONFIG[entry.ticketUsed]?.label}
                        >
                          {TICKET_CONFIG[entry.ticketUsed]?.icon}
                        </div>
                        {isRevealed ? (
                          <button
                            onClick={() => onSelectStation?.(entry.revealedStation!)}
                            className="flex items-center gap-0.5 text-[10px] font-mono font-black text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-1 py-0.5 rounded border border-amber-500/50 transition cursor-pointer"
                            title={`Click to center camera on Station #${entry.revealedStation}`}
                          >
                            <MapPin className="w-2.5 h-2.5 text-amber-400" />
                            #{entry.revealedStation}
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono font-semibold uppercase text-slate-400">
                            {TICKET_CONFIG[entry.ticketUsed]?.label}
                          </span>
                        )}
                      </div>
                    ) : isCurrent ? (
                      <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider animate-pulse">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-slate-600">—</span>
                    )}
                  </div>

                  {/* Footer status pip */}
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      entry
                        ? isRevealed
                          ? "bg-amber-400 shadow-sm shadow-amber-400/80"
                          : "bg-emerald-400"
                        : isCurrent
                        ? "bg-purple-400 animate-pulse"
                        : isSurfacing
                        ? "bg-amber-500/50"
                        : "bg-slate-800"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
