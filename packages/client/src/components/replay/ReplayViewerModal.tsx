"use client";

import React, { useState, useEffect } from "react";
import type { MoveRecord} from "@scotland-yard/common";
import { TicketType } from "@scotland-yard/common";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  X
} from "lucide-react";

interface ReplayViewerModalProps {
  moveHistory: MoveRecord[];
  currentReplayRound: number;
  maxRounds: number;
  onSetReplayRound: (round: number) => void;
  onClose: () => void;
  nearMissCount: number;
}

export const ReplayViewerModal: React.FC<ReplayViewerModalProps> = ({
  moveHistory,
  currentReplayRound,
  maxRounds,
  onSetReplayRound,
  onClose,
  nearMissCount
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1); // 1x, 2x, 4x

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.round(1200 / speed);
    const interval = setInterval(() => {
      if (currentReplayRound >= maxRounds) {
        setIsPlaying(false);
      } else {
        onSetReplayRound(currentReplayRound + 1);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, currentReplayRound, maxRounds, speed, onSetReplayRound]);

  // Current round moves
  const currentRoundXMoves = moveHistory.filter(
    (m) => m.round === currentReplayRound && m.playerRole === "misterX"
  );
  const currentRoundDetMoves = moveHistory.filter(
    (m) => m.round === currentReplayRound && m.playerRole !== "misterX"
  );

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-noir-900/98 backdrop-blur-2xl border border-slate-700/90 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              POST-GAME REPLAY SCRUBBER
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full">
                Round {currentReplayRound} of {maxRounds}
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {nearMissCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                {nearMissCount} Near Miss{nearMissCount > 1 ? "es" : ""}!
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Close Replay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="flex flex-col gap-1.5">
          <input
            type="range"
            min={1}
            max={maxRounds}
            value={currentReplayRound}
            onChange={(e) => onSetReplayRound(Number(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Round 1</span>
            <span>Round {Math.round(maxRounds / 2)}</span>
            <span>Round {maxRounds}</span>
          </div>
        </div>

        {/* Playback Controls & Info */}
        <div className="flex items-center justify-between">
          {/* Transport / Step Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSetReplayRound(1)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              title="Jump to Start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSetReplayRound(Math.max(1, currentReplayRound - 1))}
              disabled={currentReplayRound <= 1}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white"
              title="Previous Round"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/50"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button
              onClick={() => onSetReplayRound(Math.min(maxRounds, currentReplayRound + 1))}
              disabled={currentReplayRound >= maxRounds}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white"
              title="Next Round"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Toggle */}
          <div className="flex items-center gap-1 bg-noir-850 p-1 rounded-xl border border-slate-700 text-xs">
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                onClick={() => setSpeed(spd)}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition ${
                  speed === spd
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Round Move Detail */}
          {currentRoundXMoves.length > 0 && (
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Mister X True Move
              </span>
              <span className="text-xs font-mono font-bold text-purple-300">
                #{currentRoundXMoves[0].fromStation} → #{currentRoundXMoves[0].toStation} (
                {currentRoundXMoves[0].ticketUsed})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
