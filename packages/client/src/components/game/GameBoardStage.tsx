"use client";

import React from "react";
import { Loader2, Radio } from "lucide-react";
import type { GameState, CityMapData, PlayerRole, MoveRecord } from "@scotland-yard/common";
import { BoardViewport } from "../board/BoardViewport";
import { TicketLedgerHUD } from "../hud/TicketLedgerHUD";
import { TacticalBar } from "../tactical/TacticalBar";
import { ScratchpadToolbox } from "../scratchpad/ScratchpadToolbox";
import type { PinType, StationPin } from "../scratchpad/ScratchpadToolbox";
import { ReplayViewerModal } from "../replay/ReplayViewerModal";

interface GameBoardStageProps {
  activeMap: CityMapData;
  gameState: GameState;
  /** Zero-Leak: state for the canvas (Mister X already redacted for detective views). */
  displayState: GameState;
  activeRole: PlayerRole;
  reachableStationIds: number[];
  focusStationId: number | null;
  onStationClick: (stationId: number) => void;
  viewerRole: PlayerRole | "spectator" | "detectives";
  isAIThinking: boolean;
  // Replay
  isReplayActive: boolean;
  replayMisterXStation: number | undefined;
  replayTrajectory: { from: number; to: number; round: number }[];
  moveHistory: MoveRecord[];
  currentReplayRound: number;
  replayMaxRounds: number;
  nearMissCount: number;
  onSetReplayRound: (round: number) => void;
  onCloseReplay: () => void;
  // Tactical
  tacticalModeEnabled: boolean;
  targetingMode: "none" | "roadblock" | "radar";
  onSetTargetingMode: (m: "none" | "roadblock" | "radar") => void;
  onActivateDecoy: () => void;
  lastRadarResult: { stationId: number; detected: boolean } | null;
  // Scratchpad
  pins: Record<number, StationPin>;
  scratchpadEnabled: boolean;
  onToggleScratchpad: () => void;
  onExitScratchpad: () => void;
  activePinType: PinType;
  onSelectPinType: (t: PinType) => void;
  onClearAllPins: () => void;
  // Possibility Cloud & Focus
  possibilityCloudStations?: number[];
  showPossibilityCloud?: boolean;
  onTogglePossibilityCloud?: () => void;
  lastSurfacedStation?: number | null;
  lastSurfacedRound?: number | null;
  onFocusStation?: (stationId: number) => void;
}

/** Board canvas plus the floating overlays (AI banner, tools dock, ledger, replay). */
export const GameBoardStage: React.FC<GameBoardStageProps> = (p) => (
  <div className="relative flex-1 w-full h-full overflow-hidden">
    <BoardViewport
      mapData={p.activeMap}
      gameState={p.displayState}
      activeRole={p.activeRole}
      reachableStations={p.reachableStationIds}
      pins={p.pins}
      isReplayMode={p.isReplayActive}
      replayMisterXStation={p.replayMisterXStation}
      replayTrajectory={p.replayTrajectory}
      focusStationId={p.focusStationId}
      possibilityCloudStations={p.possibilityCloudStations}
      showPossibilityCloud={p.showPossibilityCloud}
      lastSurfacedStation={p.lastSurfacedStation}
      lastSurfacedRound={p.lastSurfacedRound}
      cityId={p.activeMap.id}
      onStationClick={p.onStationClick}
    />

    {/* AI Thinking Overlay Banner */}
    {p.isAIThinking && (
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-purple-950/90 backdrop-blur-md border border-purple-500/60 text-purple-200 px-5 py-2.5 rounded-2xl shadow-2xl animate-pulse">
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        <span className="text-xs font-mono font-bold tracking-wide">
          MISTER X IS PLOTTING HIS ESCAPE...
        </span>
      </div>
    )}

    {/* Top-Right Tools Dock (Possibility Cloud Toggle, Tactical Bar & Detective Scratchpad) */}
    <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-2.5">
      {/* Zero-Leak Suspect Possibility Cloud Live Toggle */}
      {p.possibilityCloudStations && p.possibilityCloudStations.length > 0 && p.viewerRole !== "misterX" && (
        <button
          onClick={p.onTogglePossibilityCloud}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-xl backdrop-blur-md ${
            p.showPossibilityCloud
              ? "bg-purple-950/85 border-purple-500 text-purple-200 ring-2 ring-purple-500/40 shadow-purple-900/30"
              : "bg-slate-900/85 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600"
          }`}
          title="Toggle Zero-Leak Suspect Possibility Cloud Deduction Heatmap"
        >
          <Radio className={`w-3.5 h-3.5 ${p.showPossibilityCloud ? "text-purple-400 animate-pulse" : "text-slate-500"}`} />
          <span>Suspect Cloud</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-500/30 text-purple-200">
            {p.possibilityCloudStations.length}
          </span>
        </button>
      )}

      {/* Tactical Action Bar */}
      {p.tacticalModeEnabled && p.gameState.tacticalState && (
        <TacticalBar
          activeRole={p.activeRole}
          tacticalState={p.gameState.tacticalState}
          targetingMode={p.targetingMode}
          onSetTargetingMode={(m) => p.onSetTargetingMode(m)}
          onActivateDecoy={p.onActivateDecoy}
          lastRadarResult={p.lastRadarResult}
        />
      )}

      {/* Detective Scratchpad Toolbox */}
      <ScratchpadToolbox
        enabled={p.scratchpadEnabled}
        onToggleEnabled={p.onToggleScratchpad}
        activePinType={p.activePinType}
        onSelectPinType={(t) => p.onSelectPinType(t)}
        pinsCount={Object.keys(p.pins).length}
        onClearAllPins={p.onClearAllPins}
      />
    </div>

    {/* Scratchpad Active Notice */}
    {p.scratchpadEnabled && (
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-2xl animate-pulse flex items-center gap-2">
        <span>
          SCRATCHPAD ACTIVE: CLICK ANY STATION TO DROP{" "}
          {p.activePinType.toUpperCase()} PIN
        </span>
        <button
          onClick={p.onExitScratchpad}
          className="bg-black/30 hover:bg-black/50 text-white rounded-full px-2 py-0.5 text-[10px]"
        >
          Exit
        </button>
      </div>
    )}

    {/* Targeting Mode Cursor Prompt */}
    {p.targetingMode !== "none" && (
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-black px-4 py-1.5 rounded-full text-xs font-black shadow-2xl animate-bounce flex items-center gap-2">
        <span>
          SELECT A STATION ON THE BOARD TO {p.targetingMode.toUpperCase()}!
        </span>
        <button
          onClick={() => p.onSetTargetingMode("none")}
          className="bg-black/30 text-white rounded-full px-1.5 text-[10px]"
        >
          ✕ Cancel
        </button>
      </div>
    )}

    {/* Floating Ticket Ledger Dock at Bottom with Squad focus support */}
    {!p.isReplayActive && (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-[95vw]">
        <TicketLedgerHUD
          players={p.gameState.players}
          activeRole={p.activeRole}
          turnOrder={p.gameState.turnOrder}
          viewerRole={p.viewerRole}
          isSurfaced={p.activeMap.surfacingRounds.includes(p.gameState.currentRound)}
          isGameOver={p.gameState.status === "detectives_won" || p.gameState.status === "mister_x_won"}
          onSelectPlayer={(role) => {
            const st = p.gameState.players[role]?.station;
            if (st && st > 0) {
              p.onFocusStation?.(st);
            }
          }}
        />
      </div>
    )}

    {/* Post-Game Replay Scrubber Modal */}
    {p.isReplayActive && (
      <ReplayViewerModal
        moveHistory={p.moveHistory}
        currentReplayRound={p.currentReplayRound}
        maxRounds={p.replayMaxRounds}
        onSetReplayRound={p.onSetReplayRound}
        onClose={p.onCloseReplay}
        nearMissCount={p.nearMissCount}
      />
    )}
  </div>
);
