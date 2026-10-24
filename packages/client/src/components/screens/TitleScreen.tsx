"use client";

import React from "react";
import {
  Shield,
  Radio,
  Play,
  Users,
  BookOpen,
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
  MapPin,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import { soundEngine } from "../../lib/audio";

interface TitleScreenProps {
  hasActiveGame: boolean;
  onNewGame: () => void;
  onResumeGame: () => void;
  onOpenMultiplayer: () => void;
  onOpenRulebook: () => void;
  onOpenSettings: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasActiveGame,
  onNewGame,
  onResumeGame,
  onOpenMultiplayer,
  onOpenRulebook,
  onOpenSettings
}) => {
  const [isMuted, setIsMuted] = React.useState(() => soundEngine.getSettings().muted);

  const toggleSound = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  return (
    <div className="relative min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-12 overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Header Controls */}
      <header className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
          <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>SCOTLAND YARD DISPATCH • ACTIVE FREQUENCY</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            title="Toggle Sound Mute (M)"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
            title="Station Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Center Hero Section */}
      <main className="relative z-10 max-w-2xl w-full mx-auto my-auto text-center flex flex-col items-center">
        {/* Logo Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-purple-500/20 to-purple-900/40 border border-purple-500/50 flex items-center justify-center text-purple-300 mb-6 shadow-2xl shadow-purple-950/60 ring-1 ring-purple-400/30">
          <Shield className="w-8 h-8 fill-current" />
        </div>

        {/* Title */}
        <div className="text-[11px] uppercase tracking-[0.3em] font-extrabold text-amber-400 mb-2">
          Tactical Deduction Simulation
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase drop-shadow-md">
          Scotland Yard
        </h1>
        <p className="text-sm sm:text-base text-slate-400 mt-3 max-w-lg leading-relaxed">
          The fugitive is on the run across the transit network. Track tickets, predict movement, deploy roadblocks, and close the net.
        </p>

        {/* Main Action Menu */}
        <div className="w-full max-w-md space-y-3 mt-8">
          {/* Resume Match (if active) */}
          {hasActiveGame && (
            <button
              onClick={onResumeGame}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-between shadow-xl shadow-emerald-500/20 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Play className="w-5 h-5 fill-current" />
                <span>Resume Active Investigation</span>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {/* New Game Setup */}
          <button
            onClick={onNewGame}
            className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm sm:text-base transition-all duration-200 flex items-center justify-between shadow-xl shadow-purple-900/40 group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 fill-current" />
              <span>Start New Investigation</span>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Online Multiplayer (Multi-Device) */}
          <button
            onClick={onOpenMultiplayer}
            className="w-full py-3.5 px-6 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 font-bold text-sm sm:text-base transition-all duration-200 border border-amber-500/40 flex items-center justify-between shadow-lg group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span>Online Multiplayer (Multi-Device)</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold uppercase tracking-wider">
              Host / Join
            </span>
          </button>

          {/* Secondary Options */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onOpenRulebook}
              className="py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs border border-slate-800 transition flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>Field Manual</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs border border-slate-800 transition flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Audio & Controls</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 pt-6 border-t border-slate-800/80">
        <div>London (199) • Paris (280) • New York (380)</div>
        <div className="flex items-center gap-4">
          <span>Digital Scotland Yard Edition</span>
          <span>•</span>
          <span className="text-slate-400">Press &apos;?&apos; for Rulebook</span>
        </div>
      </footer>
    </div>
  );
};
