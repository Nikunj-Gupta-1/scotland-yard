"use client";

import React from "react";
import { MultiplayerConnectModal } from "../lobby/MultiplayerConnectModal";
import { SettingsModal } from "../modals/SettingsModal";
import { RulebookModal } from "../modals/RulebookModal";
import type { useGameSocket } from "../../hooks/useGameSocket";

interface SharedModalsProps {
  socket: ReturnType<typeof useGameSocket>;
  isMultiplayerModalOpen: boolean;
  initialJoinCode: string;
  onCloseMultiplayerModal: () => void;
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  isRulebookOpen: boolean;
  onCloseRulebook: () => void;
  onNewGame: () => void;
}

/** Multiplayer connect, settings and rulebook modals shared by the title and game screens. */
export const SharedModals: React.FC<SharedModalsProps> = (p) => (
  <>
    <MultiplayerConnectModal
      isOpen={p.isMultiplayerModalOpen}
      initialRoomCode={p.initialJoinCode}
      onClose={p.onCloseMultiplayerModal}
      onCreateRoom={async (hostName, cfg) => {
        const res = await p.socket.createRoom(hostName, cfg);
        if (res.success) {
          p.onCloseMultiplayerModal();
        }
        return res;
      }}
      onJoinRoom={async (code, name) => {
        const res = await p.socket.joinRoom(code, name);
        if (res.success) {
          p.onCloseMultiplayerModal();
        }
        return res;
      }}
    />
    <SettingsModal isOpen={p.isSettingsOpen} onClose={p.onCloseSettings} onNewGame={p.onNewGame} />
    <RulebookModal isOpen={p.isRulebookOpen} onClose={p.onCloseRulebook} />
  </>
);
