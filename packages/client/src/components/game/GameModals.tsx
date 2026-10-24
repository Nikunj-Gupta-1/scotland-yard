"use client";

import React from "react";
import type { PlayerState, TicketType, WinInfo } from "@scotland-yard/common";
import { MoveConfirmModal } from "../hud/MoveConfirmModal";
import { PinNoteModal } from "../scratchpad/PinNoteModal";
import type { StationPin } from "../scratchpad/ScratchpadToolbox";
import { VictoryModal } from "../hud/VictoryModal";
import { LocalShieldModal } from "../hud/LocalShieldModal";

interface GameModalsProps {
  activePlayer: PlayerState | undefined;
  targetStationId: number | null;
  availableTicketsForMove: TicketType[];
  isDoubleMoveActive: boolean;
  onConfirmMove: (ticketUsed: TicketType, isDoubleMove?: boolean) => void;
  onCancelMove: () => void;
  noteModalStationId: number | null;
  pins: Record<number, StationPin>;
  onSaveNote: (stationId: number, noteText: string) => void;
  onDeleteNote: (stationId: number) => void;
  onCloseNote: () => void;
  winInfo: WinInfo | undefined;
  showVictoryModal: boolean;
  onPlayAgain: () => void;
  onInspectBoard: () => void;
  onViewReplay: () => void;
  showShield: boolean;
  onDismissShield: () => void;
}

/** In-match modals: move confirmation, pin note editor, victory dialog, and hotseat privacy shield. */
export const GameModals: React.FC<GameModalsProps> = (p) => (
  <>
    {p.targetStationId && p.activePlayer && (
      <MoveConfirmModal
        player={p.activePlayer}
        toStationId={p.targetStationId}
        availableTickets={p.availableTicketsForMove}
        isDoubleMoveActive={p.isDoubleMoveActive}
        onConfirmMove={p.onConfirmMove}
        onCancel={p.onCancelMove}
      />
    )}

    {p.noteModalStationId !== null && (
      <PinNoteModal
        stationId={p.noteModalStationId}
        initialNote={p.pins[p.noteModalStationId]?.note}
        onSave={(noteText) => p.onSaveNote(p.noteModalStationId!, noteText)}
        onDelete={() => p.onDeleteNote(p.noteModalStationId!)}
        onClose={p.onCloseNote}
      />
    )}

    {p.winInfo && p.showVictoryModal && (
      <VictoryModal
        winInfo={p.winInfo}
        onPlayAgain={p.onPlayAgain}
        onInspectBoard={p.onInspectBoard}
        onViewReplay={p.onViewReplay}
      />
    )}

    {p.showShield && p.activePlayer && (
      <LocalShieldModal player={p.activePlayer} onDismiss={p.onDismissShield} />
    )}
  </>
);
