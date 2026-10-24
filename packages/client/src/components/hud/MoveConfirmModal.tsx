"use client";

import React, { useState } from "react";
import type { PlayerState, TicketType } from "@scotland-yard/common";
import { Car, Bus, Train, ShieldAlert, Sparkles, ArrowRight, X } from "lucide-react";

interface MoveConfirmModalProps {
  player: PlayerState;
  toStationId: number;
  availableTickets: TicketType[];
  isDoubleMoveActive: boolean;
  onConfirmMove: (ticketUsed: TicketType, isDoubleMove?: boolean) => void;
  onCancel: () => void;
}

const TICKET_DETAILS: Record<
  TicketType,
  { label: string; bg: string; border: string; text: string; icon: React.ReactNode; desc: string }
> = {
  taxi: {
    label: "Yellow Cab / Taxi",
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    border: "border-amber-500/40",
    text: "text-amber-400",
    icon: <Car className="w-4 h-4" />,
    desc: "Short distance hop across streets"
  },
  bus: {
    label: "Emerald Bus",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    icon: <Bus className="w-4 h-4" />,
    desc: "Medium distance arterial route"
  },
  underground: {
    label: "Underground / Tube",
    bg: "bg-red-500/10 hover:bg-red-500/20",
    border: "border-red-500/40",
    text: "text-red-400",
    icon: <Train className="w-4 h-4" />,
    desc: "Rapid transit across the city"
  },
  black: {
    label: "Black Secret Ticket",
    bg: "bg-purple-500/20 hover:bg-purple-500/30",
    border: "border-purple-500/50",
    text: "text-purple-300",
    icon: <ShieldAlert className="w-4 h-4" />,
    desc: "Hides transit mode or takes river ferry"
  },
  doubleMove: {
    label: "2x Double Move",
    bg: "bg-fuchsia-500/20 hover:bg-fuchsia-500/30",
    border: "border-fuchsia-500/50",
    text: "text-fuchsia-300",
    icon: <Sparkles className="w-4 h-4" />,
    desc: "Make two moves in one turn"
  }
};

export const MoveConfirmModal: React.FC<MoveConfirmModalProps> = ({
  player,
  toStationId,
  availableTickets,
  isDoubleMoveActive,
  onConfirmMove,
  onCancel
}) => {
  const [selectedTicket, setSelectedTicket] = useState<TicketType>(availableTickets[0] || "taxi");
  const [useDoubleMove, setUseDoubleMove] = useState(false);

  const isMisterX = player.role === "misterX";
  const canUseDoubleMove =
    isMisterX && !isDoubleMoveActive && player.tickets.doubleMove > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-move-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm sm:max-w-md bg-noir-900/95 backdrop-blur-xl border border-purple-500/40 rounded-3xl p-5 shadow-2xl relative text-left">
        {/* Close Button */}
        <button
          onClick={onCancel}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-950/70 border border-purple-500/50 flex items-center justify-center text-purple-300">
            {isMisterX ? (
              <span className="font-black text-lg">X</span>
            ) : (
              <span className="font-bold text-sm">
                {player.name.replace("Detective ", "")[0]}
              </span>
            )}
          </div>
          <div>
            <h3 id="confirm-move-title" className="text-base font-bold text-white leading-tight">
              Confirm Movement
            </h3>
            <p className="text-xs text-slate-400">
              Moving <span className="text-slate-200 font-semibold">{player.name}</span>
            </p>
          </div>
        </div>

        {/* Route Visualizer */}
        <div className="flex items-center justify-between bg-noir-950/90 p-3 rounded-2xl border border-slate-800 mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Origin
            </span>
            <span className="text-sm font-mono font-bold text-slate-200">
              Station #{player.station}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-600 px-2">
            <div className="w-6 h-[2px] bg-slate-700" />
            <ArrowRight className="w-4 h-4 text-purple-400" />
            <div className="w-6 h-[2px] bg-slate-700" />
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Destination
            </span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              Station #{toStationId}
            </span>
          </div>
        </div>

        {/* Available Tickets Selection */}
        <div className="space-y-1.5 mb-4">
          <span className="text-xs font-semibold text-slate-300 block mb-1">
            Select Transit Ticket to Spend:
          </span>
          <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {availableTickets.map((ticket) => {
              const details = TICKET_DETAILS[ticket];
              const remaining = player.tickets[ticket];
              const isSelected = selectedTicket === ticket;

              return (
                <button
                  key={ticket}
                  type="button"
                  onClick={() => setSelectedTicket(ticket)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                    isSelected
                      ? `bg-slate-800 ${details.border} ring-2 ring-purple-500/50`
                      : `${details.bg} border-slate-800 hover:border-slate-700`
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg bg-noir-950 border border-slate-700 ${details.text}`}
                    >
                      {details.icon}
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${details.text}`}>
                        {details.label}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {details.desc}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                      {remaining} left
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mister X Double-Move (2x) Option */}
        {canUseDoubleMove && (
          <div className="mb-4 p-2.5 rounded-xl bg-fuchsia-950/30 border border-fuchsia-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-400" />
              <div>
                <span className="text-xs font-bold text-fuchsia-300 block">
                  Activate Double-Move (2x)?
                </span>
                <span className="text-[10px] text-slate-400">
                  Allows a second consecutive move ({player.tickets.doubleMove} cards remaining)
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={useDoubleMove}
              onChange={(e) => setUseDoubleMove(e.target.checked)}
              className="w-4 h-4 accent-fuchsia-500 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmMove(selectedTicket, useDoubleMove)}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/50 transition"
          >
            Confirm Move
          </button>
        </div>
      </div>
    </div>
  );
};
