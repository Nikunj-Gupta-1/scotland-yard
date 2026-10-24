"use client";

import { useState, useCallback } from "react";
import type { PinType, StationPin } from "../components/scratchpad/ScratchpadToolbox";
import type { SyncedPin } from "./useGameSocket";

/** Detective scratchpad / whiteboard state: pins, active tool, note editing. */
export function useScratchpad(args: {
  isMultiplayer: boolean;
  updatePins: (pins: Record<number, SyncedPin>) => void;
}) {
  const { isMultiplayer, updatePins } = args;
  const [enabled, setEnabled] = useState(false);
  const [activePinType, setActivePinType] = useState<PinType>("flag");
  const [pins, setPins] = useState<Record<number, StationPin>>({});
  const [noteModalStationId, setNoteModalStationId] = useState<number | null>(null);

  const toggleEnabled = useCallback(() => setEnabled((prev) => !prev), []);

  /** Handle a board click while the scratchpad is active. */
  const handleStationClick = useCallback(
    (stationId: number) => {
      if (activePinType === "note") {
        setNoteModalStationId(stationId);
        return;
      }
      setPins((prev) => {
        const next = { ...prev };
        if (next[stationId]?.type === activePinType) {
          delete next[stationId];
        } else {
          next[stationId] = { stationId, type: activePinType };
        }
        return next;
      });
    },
    [activePinType]
  );

  const clearAll = useCallback(() => {
    setPins({});
    if (isMultiplayer) updatePins({});
  }, [isMultiplayer, updatePins]);

  const saveNote = useCallback(
    (stationId: number, noteText: string) => {
      const next = {
        ...pins,
        [stationId]: { stationId, type: "note" as const, note: noteText }
      };
      setPins(next);
      if (isMultiplayer) updatePins(next);
      setNoteModalStationId(null);
    },
    [pins, isMultiplayer, updatePins]
  );

  const deleteNote = useCallback(
    (stationId: number) => {
      const next = { ...pins };
      delete next[stationId];
      setPins(next);
      if (isMultiplayer) updatePins(next);
      setNoteModalStationId(null);
    },
    [pins, isMultiplayer, updatePins]
  );

  return {
    enabled,
    setEnabled,
    toggleEnabled,
    activePinType,
    setActivePinType,
    pins,
    setPins,
    noteModalStationId,
    setNoteModalStationId,
    handleStationClick,
    clearAll,
    saveNote,
    deleteNote
  };
}
