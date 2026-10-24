"use client";

import React, { useState } from "react";
import { FileText, X } from "lucide-react";

interface PinNoteModalProps {
  stationId: number;
  initialNote?: string;
  onSave: (note: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const PinNoteModal: React.FC<PinNoteModalProps> = ({
  stationId,
  initialNote = "",
  onSave,
  onDelete,
  onClose
}) => {
  const [text, setText] = useState(initialNote);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSave(text.trim());
    } else if (onDelete) {
      onDelete();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-noir-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-blue-950/70 border border-blue-500/50 text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Detective Note for Station #{stationId}
            </h4>
            <p className="text-[11px] text-slate-400">
              Record deduction notes and route suspicions
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Can only reach with Bus from #67, or Tube hub escape..."
            className="w-full bg-noir-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            {initialNote && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-1.5"
              >
                Delete Note
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-md shadow-blue-900/40"
              >
                Save Pin
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
