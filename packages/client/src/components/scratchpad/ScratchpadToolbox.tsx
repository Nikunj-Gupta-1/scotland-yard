"use client";

import React from "react";
import { Flag, HelpCircle, XCircle, FileText, Trash2, Edit3, Eye, EyeOff } from "lucide-react";

export type PinType = "flag" | "question" | "cross" | "note";

export interface StationPin {
  stationId: number;
  type: PinType;
  note?: string;
}

interface ScratchpadToolboxProps {
  enabled: boolean;
  onToggleEnabled: () => void;
  activePinType: PinType;
  onSelectPinType: (type: PinType) => void;
  pinsCount: number;
  onClearAllPins: () => void;
}

export const ScratchpadToolbox: React.FC<ScratchpadToolboxProps> = ({
  enabled,
  onToggleEnabled,
  activePinType,
  onSelectPinType,
  pinsCount,
  onClearAllPins
}) => {
  return (
    <div className="flex items-center gap-2 bg-noir-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl">
      {/* Enable/Disable Toggle */}
      <button
        onClick={onToggleEnabled}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold transition ${
          enabled
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
            : "bg-noir-850 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
        }`}
        title="Toggle Detective Whiteboard / Pinning Layer"
      >
        <Edit3 className="w-3.5 h-3.5" />
        <span>Scratchpad</span>
        {pinsCount > 0 && (
          <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded-full font-mono">
            {pinsCount}
          </span>
        )}
      </button>

      {/* Pin Type Buttons (visible when enabled) */}
      {enabled && (
        <div className="flex items-center gap-1 pl-2 border-l border-slate-800 animate-in fade-in duration-150">
          {/* Flag (High Suspect) */}
          <button
            onClick={() => onSelectPinType("flag")}
            className={`p-1.5 rounded-lg transition ${
              activePinType === "flag"
                ? "bg-red-500 text-white shadow-md shadow-red-900/50"
                : "text-red-400 hover:bg-red-950/40"
            }`}
            title="Red Flag: High Probability Suspect Location"
          >
            <Flag className="w-4 h-4" />
          </button>

          {/* Question Mark (Possible) */}
          <button
            onClick={() => onSelectPinType("question")}
            className={`p-1.5 rounded-lg transition ${
              activePinType === "question"
                ? "bg-amber-500 text-black shadow-md shadow-amber-900/50"
                : "text-amber-400 hover:bg-amber-950/40"
            }`}
            title="Question Mark: Possible Location"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Cross (Ruled Out) */}
          <button
            onClick={() => onSelectPinType("cross")}
            className={`p-1.5 rounded-lg transition ${
              activePinType === "cross"
                ? "bg-slate-600 text-white shadow-md"
                : "text-slate-400 hover:bg-slate-800"
            }`}
            title="Cross: Ruled Out / Clear"
          >
            <XCircle className="w-4 h-4" />
          </button>

          {/* Text Note */}
          <button
            onClick={() => onSelectPinType("note")}
            className={`p-1.5 rounded-lg transition ${
              activePinType === "note"
                ? "bg-blue-500 text-white shadow-md shadow-blue-900/50"
                : "text-blue-400 hover:bg-blue-950/40"
            }`}
            title="Detective Note: Add custom text note to station"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Clear All */}
          {pinsCount > 0 && (
            <button
              onClick={onClearAllPins}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg ml-1 transition"
              title="Clear all pins on the board"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
