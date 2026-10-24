"use client";

import React, { useState, useEffect } from "react";
import {
  Volume2,
  VolumeX,
  CloudRain,
  Sliders,
  Keyboard,
  X,
  Play,
  RotateCcw
} from "lucide-react";
import { soundEngine } from "../../lib/audio";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewGame: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onNewGame
}) => {
  const [settings, setSettings] = useState(() => soundEngine.getSettings());
  const [ambientPlaying, setAmbientPlaying] = useState(() => soundEngine.getIsAmbientPlaying());

  useEffect(() => {
    if (isOpen) {
      setSettings(soundEngine.getSettings());
      setAmbientPlaying(soundEngine.getIsAmbientPlaying());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMuteToggle = () => {
    const isMuted = soundEngine.toggleMute();
    setSettings((s) => ({ ...s, muted: isMuted }));
  };

  const handleMasterChange = (val: number) => {
    soundEngine.updateSettings({ masterVolume: val });
    setSettings((s) => ({ ...s, masterVolume: val }));
  };

  const handleSfxChange = (val: number) => {
    soundEngine.updateSettings({ sfxVolume: val });
    setSettings((s) => ({ ...s, sfxVolume: val }));
    soundEngine.playTicketClick();
  };

  const handleAmbientChange = (val: number) => {
    soundEngine.updateSettings({ ambientVolume: val });
    setSettings((s) => ({ ...s, ambientVolume: val }));
  };

  const handleAmbientToggle = () => {
    const playing = soundEngine.toggleAmbient();
    setAmbientPlaying(playing);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Close Settings (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Station Dispatch Settings</h2>
            <p className="text-xs text-slate-400">Audio soundscape & tactical keybindings</p>
          </div>
        </div>

        {/* Audio Section */}
        <div className="space-y-4 mb-6 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-amber-400" /> Audio Master
            </span>
            <button
              onClick={handleMuteToggle}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                settings.muted
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {settings.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {settings.muted ? "Muted" : "Unmuted"}
            </button>
          </div>

          {/* Master Volume Slider */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Master Volume</span>
              <span className="font-mono text-amber-400">{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => handleMasterChange(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* SFX Volume Slider */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Sound Effects (Tickets, Sirens, Pings)</span>
              <span className="font-mono text-amber-400">{Math.round(settings.sfxVolume * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => handleSfxChange(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => soundEngine.playTicketClick()}
                className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white border border-slate-700 whitespace-nowrap"
              >
                Test Click
              </button>
            </div>
          </div>

          {/* Ambient Rain Soundscape */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-slate-200">Noir City Rain Soundscape</span>
              </div>
              <button
                onClick={handleAmbientToggle}
                className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                  ambientPlaying
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {ambientPlaying ? "Playing" : "Paused"}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.ambientVolume}
              onChange={(e) => handleAmbientChange(parseFloat(e.target.value))}
              className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Section */}
        <div className="mb-6">
          <div className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
            <Keyboard className="w-4 h-4 text-purple-400" /> Tactical Keybindings
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { key: "Space", desc: "Center camera on active player" },
              { key: "1 - 5", desc: "Quick-focus Detectives (Red to Purple)" },
              { key: "S", desc: "Toggle Detective Scratchpad Whiteboard" },
              { key: "M", desc: "Toggle Master Audio Mute" },
              { key: "?", desc: "Open Official Scotland Yard Rulebook" },
              { key: "Esc", desc: "Close open modals & cancel target mode" }
            ].map((kb) => (
              <div
                key={kb.key}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-slate-800/80"
              >
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono font-bold text-[11px] border border-slate-700 shadow-sm">
                  {kb.key}
                </kbd>
                <span className="text-slate-400 text-[11px] text-right ml-2">{kb.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={() => {
              soundEngine.updateSettings({ masterVolume: 0.8, sfxVolume: 0.9, ambientVolume: 0.4, muted: false });
              setSettings(soundEngine.getSettings());
            }}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onClose();
                onNewGame();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            >
              Start New Match
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
