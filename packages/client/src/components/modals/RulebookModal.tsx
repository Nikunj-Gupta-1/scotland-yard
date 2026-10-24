"use client";

import React, { useState } from "react";
import {
  BookOpen,
  X,
  Target,
  Navigation,
  Eye,
  Coins,
  Sparkles,
  Shield,
  HelpCircle
} from "lucide-react";

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<
    "objective" | "transit" | "surfacing" | "economy" | "tactical"
  >("objective");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Close Field Manual (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Scotland Yard Field Manual</h2>
            <p className="text-xs text-slate-400">Authentic deduction rules & tactical dossier</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5 overflow-x-auto text-xs">
          {[
            { id: "objective", label: "Objective", icon: Target },
            { id: "transit", label: "Transit & Tickets", icon: Navigation },
            { id: "surfacing", label: "Surfacing", icon: Eye },
            { id: "economy", label: "Ticket Surrender", icon: Coins },
            { id: "tactical", label: "Tactical Powers", icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-3 font-bold rounded-lg transition whitespace-nowrap flex items-center justify-center gap-1.5 ${
                  isActive
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-slate-300 leading-relaxed">
          {activeTab === "objective" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" /> Detective Victory Condition
                </h3>
                <p>
                  The Scotland Yard Detective Squad wins immediately if <strong>any detective lands on the station currently occupied by Mister X</strong>, or if Mister X becomes completely trapped with zero valid moves remaining.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-[10px] font-black border border-purple-500/50">
                    X
                  </span>
                  Mister X Victory Condition
                </h3>
                <p>
                  Mister X wins if he evades capture through the end of <strong>Round 24</strong>, or if all detectives run out of tickets and can no longer execute any legal movements.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="font-bold text-slate-200 mb-1">Turn Sequence</h4>
                <p>
                  Every round begins with Mister X making his move first. Following Mister X, each of the active detectives takes their turn in fixed sequence (Red → Green → Yellow → Blue → Purple).
                </p>
              </div>
            </div>
          )}

          {activeTab === "transit" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="font-bold text-amber-300 flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Taxi (Yellow)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Short-range local hops. Every station on the map connects to at least one taxi route.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="font-bold text-emerald-300 flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Bus (Green)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Arterial routes linking major intersections across the city, allowing 2 to 3 station hops.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30">
                  <div className="font-bold text-red-300 flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Underground (Red)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rapid long-distance transit hubs. Covers huge distances across the city in a single leap.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30">
                  <div className="font-bold text-purple-300 flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-purple-400" /> Black Ticket (Wildcard)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Exclusive to Mister X. Can be used for ANY transport mode (including River Ferries) without revealing the vehicle type!
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="font-bold text-slate-200 mb-1">Double-Move (2x) Cards</h4>
                <p>
                  Mister X possesses two <strong>2x Double-Move cards</strong>. Playing one allows Mister X to execute two full consecutive moves in a single turn, expending two tickets and leaving detectives guessing which path was taken.
                </p>
              </div>
            </div>
          )}

          {activeTab === "surfacing" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40">
                <h3 className="font-bold text-sm text-amber-300 mb-1 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" /> Surfacing Rounds: 3, 8, 13, 18, 24
                </h3>
                <p>
                  During normal rounds, Mister X travels in secret—detectives only observe which <em>ticket</em> was played in the Travel Log ribbon.
                </p>
                <p className="mt-2">
                  However, on designated <strong>Surfacing Rounds (3, 8, 13, 18, 24)</strong>, Mister X is forced to emerge from hiding and reveal his exact station on the board!
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="font-bold text-slate-200 mb-1">Detective Strategy Tip</h4>
                <p>
                  Use the <strong>Detective Scratchpad (Key: S)</strong> to drop 🚩 Flag and ❓ Question pins where you deduce Mister X might be headed after a surfacing round. Coordinated detectives form a perimeter rather than all chasing the same hub.
                </p>
              </div>
            </div>
          )}

          {activeTab === "economy" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <h3 className="font-bold text-sm text-white mb-1 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" /> Authentic Ticket Surrender Rule
                </h3>
                <p>
                  Unlike many modern games where resources disappear, in official Scotland Yard rules:
                </p>
                <p className="mt-2 text-amber-300 font-semibold bg-amber-950/40 p-2.5 rounded-lg border border-amber-500/30">
                  Every time a detective uses a Taxi, Bus, or Underground ticket, that ticket is immediately handed over and transferred into Mister X&apos;s inventory!
                </p>
                <p className="mt-2">
                  Detectives start with limited tickets (10 Taxi, 8 Bus, 4 Underground). If you exhaust your tickets, you become stranded and can no longer move. Keep an eye on the bottom Ticket Ledger!
                </p>
              </div>
            </div>
          )}

          {activeTab === "tactical" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-amber-300 flex items-center gap-2 mb-1">
                  <span>🚧</span> Police Roadblocks (Detectives)
                </div>
                <p>
                  Detectives can deploy a police checkpoint barrier onto any station. For the next <strong>2 rounds</strong>, neither detectives nor Mister X may enter or pass through that station. Ideal for sealing bridge choke points!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="font-bold text-sky-300 flex items-center gap-2 mb-1">
                  <span>📡</span> Informant Radar Ping (Detectives)
                </div>
                <p>
                  Scans a chosen station with police informants. Returns an instant alert indicating whether Mister X is within a <strong>2-hop radius</strong> of that station.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/40">
                <div className="font-bold text-purple-300 flex items-center gap-2 mb-1">
                  <span>🎭</span> Mister X Decoy Ticket (Fugitive)
                </div>
                <p>
                  Mister X can arm a decoy before moving. His next move records a randomized false transit ticket into the public travel log, throwing the detective squad off the scent!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-lg shadow-purple-900/30"
          >
            Acknowledge & Return
          </button>
        </div>
      </div>
    </div>
  );
};
