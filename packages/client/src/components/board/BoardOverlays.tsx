import React from "react";
import type { StationNode } from "@scotland-yard/common";
import { ZoomIn, ZoomOut, Maximize2, Crosshair } from "lucide-react";
import { TRANSIT_COLORS } from "./boardConstants";

interface ToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFocusActive: () => void;
}

/** Floating Viewport Navigation Toolbar */
export const ViewportToolbar: React.FC<ToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onFocusActive
}) => (
  <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-noir-900/90 backdrop-blur-md p-2 rounded-xl border border-slate-700/50 shadow-2xl">
    <button
      onClick={onZoomIn}
      title="Zoom In"
      className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
    >
      <ZoomIn className="w-5 h-5" />
    </button>
    <button
      onClick={onZoomOut}
      title="Zoom Out"
      className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
    >
      <ZoomOut className="w-5 h-5" />
    </button>
    <button
      onClick={onReset}
      title="Reset View"
      className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition"
    >
      <Maximize2 className="w-5 h-5" />
    </button>
    <button
      onClick={onFocusActive}
      title="Focus Active Player"
      className="p-2 hover:bg-slate-800 rounded-lg text-amber-400 hover:text-amber-300 transition"
    >
      <Crosshair className="w-5 h-5" />
    </button>
  </div>
);

/** Station Hover Tooltip (DOM overlay; only public station data) */
export const HoverTooltip: React.FC<{ station: StationNode; isReachable: boolean }> = ({
  station,
  isReachable
}) => (
  <div className="absolute top-6 left-6 bg-noir-900/95 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-700/60 shadow-2xl pointer-events-none flex flex-col gap-1.5 min-w-[180px]">
    <div className="flex items-center justify-between">
      <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
        Station
      </span>
      <span className="text-lg font-mono font-bold text-white">
        #{station.id}
      </span>
    </div>
    <div className="flex gap-2 mt-1">
      {station.transports.map((t) => (
        <span
          key={t}
          className="text-[10px] uppercase font-bold px-2 py-0.5 rounded"
          style={{
            backgroundColor: `${TRANSIT_COLORS[t]}22`,
            color: TRANSIT_COLORS[t],
            border: `1px solid ${TRANSIT_COLORS[t]}55`
          }}
        >
          {t}
        </span>
      ))}
    </div>
    {isReachable && (
      <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
        ● Reachable destination
      </div>
    )}
  </div>
);

/** Transit Legend Bar */
export const TransitLegend: React.FC = () => (
  <div className="absolute bottom-6 left-6 hidden sm:flex items-center gap-4 bg-noir-900/85 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/50 text-xs font-medium text-slate-300 shadow-xl">
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-1 bg-transit-taxi rounded"></span>
      <span>Taxi</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-1 bg-transit-bus rounded border-dashed"></span>
      <span>Bus</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-1 bg-transit-tube rounded"></span>
      <span>Underground</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-1 bg-transit-ferry rounded"></span>
      <span>River Ferry</span>
    </div>
  </div>
);
