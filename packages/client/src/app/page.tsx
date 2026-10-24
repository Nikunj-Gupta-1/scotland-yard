"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { getMapById } from "@scotland-yard/common";
import { TravelLogHUD } from "../components/hud/TravelLogHUD";
import { TurnBanner } from "../components/hud/TurnBanner";
import { TitleScreen } from "../components/screens/TitleScreen";
import { GameSetupScreen } from "../components/screens/GameSetupScreen";
import type { LocalMatchSetup } from "../components/screens/GameSetupScreen";
import { LobbyView } from "../components/lobby/LobbyView";
import { SharedModals } from "../components/screens/SharedModals";
import { GameHeader } from "../components/game/GameHeader";
import { GameBoardStage } from "../components/game/GameBoardStage";
import { GameModals } from "../components/game/GameModals";
import { soundEngine } from "../lib/audio";
import { calculateSuspectPossibilityCloud } from "../lib/deductionEngine";
import { getDisplayState, getViewerRole } from "../lib/localMatch";
import type { GameMode, Screen } from "../lib/localMatch";
import { useGameSocket } from "../hooks/useGameSocket";
import { useLocalGame } from "../hooks/useLocalGame";
import { useScratchpad } from "../hooks/useScratchpad";
import { useReplay } from "../hooks/useReplay";
import { useAiTurns } from "../hooks/useAiTurns";
import { useMultiplayerSync } from "../hooks/useMultiplayerSync";
import { useBoardInteraction } from "../hooks/useBoardInteraction";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useGameAudioCues } from "../hooks/useGameAudioCues";

export type { GameMode };

export default function ScotlandYardGame() {
  const [isMounted, setIsMounted] = useState(false);

  // Screen Navigation State
  const [currentScreen, setCurrentScreen] = useState<Screen>("title");
  const [localSetup, setLocalSetup] = useState<LocalMatchSetup | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("single_player");

  // Multiplayer Socket Integration
  const socket = useGameSocket();
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [initialJoinCode, setInitialJoinCode] = useState("");

  // Local engine (single-player / pass-and-play) + match configuration
  const local = useLocalGame();
  const { engine, rebuildEngine } = local;
  const activeMap = useMemo(
    () =>
      getMapById(
        gameMode === "multiplayer" && socket.multiplayerGameState
          ? socket.multiplayerGameState.config.cityId
          : local.selectedCityId
      ),
    [gameMode, socket.multiplayerGameState, local.selectedCityId]
  );

  // Modal / overlay states
  const [showVictoryModal, setShowVictoryModal] = useState(true);
  const [showShield, setShowShield] = useState(false);
  const [privacyShieldEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulebookOpen, setIsRulebookOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [focusStationId, setFocusStationId] = useState<number | null>(null);

  const scratchpad = useScratchpad({
    isMultiplayer: gameMode === "multiplayer",
    updatePins: socket.updatePins
  });
  const replay = useReplay(engine);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      setIsMuted(soundEngine.getSettings().muted);
      const params = new URLSearchParams(window.location.search);
      const joinCode = params.get("join");
      if (joinCode) {
        setGameMode("multiplayer");
        setInitialJoinCode(joinCode.toUpperCase());
        setIsMultiplayerModalOpen(true);
      }
    }
  }, []);

  useMultiplayerSync({
    gameMode,
    setGameMode,
    setCurrentScreen,
    setPins: scratchpad.setPins,
    multiplayerGameState: socket.multiplayerGameState,
    lobbyState: socket.lobbyState,
    remotePins: socket.remotePins,
    resumedFromRefresh: socket.resumedFromRefresh
  });

  // Active game state: either multiplayer network state or local engine state
  const gameState =
    gameMode === "multiplayer" && socket.multiplayerGameState
      ? socket.multiplayerGameState
      : engine.state;
  const activeRole = gameState.activeRole;
  const activePlayer = gameState.players[activeRole];

  const [showPossibilityCloud, setShowPossibilityCloud] = useState(true);

  // Compute Zero-Leak Suspect Possibility Cloud from public travel log only
  const { detectiveStations, blockedStations } = useMemo(() => {
    const detStations: number[] = [];
    if (gameState.players) {
      Object.values(gameState.players).forEach((p) => {
        if (p.role !== "misterX" && p.station > 0) {
          detStations.push(p.station);
        }
      });
    }
    const roadblocks = gameState.tacticalState?.roadblocks.map((r) => r.stationId) || [];
    return { detectiveStations: detStations, blockedStations: roadblocks };
  }, [gameState.players, gameState.tacticalState?.roadblocks]);

  const deductionResult = useMemo(
    () =>
      calculateSuspectPossibilityCloud(
        activeMap,
        gameState.misterXTravelLog,
        detectiveStations,
        blockedStations
      ),
    [activeMap, gameState.misterXTravelLog, detectiveStations, blockedStations]
  );

  // In multiplayer, check if user controls the currently active player (including multi-role claims)
  const isMyMultiplayerTurn =
    gameMode === "multiplayer"
      ? socket.myRole === activeRole || socket.myRoles.includes(activeRole)
      : true;

  const board = useBoardInteraction({
    engine,
    revision: local.revision,
    bump: local.bump,
    gameState,
    gameMode,
    isReplayActive: replay.isReplayActive,
    isMyMultiplayerTurn,
    privacyShieldEnabled,
    setShowShield,
    socket,
    scratchpad
  });

  const toggleMute = useCallback(() => setIsMuted(soundEngine.toggleMute()), []);

  useKeyboardShortcuts(gameState, {
    onEscape: () => {
      setIsSettingsOpen(false);
      setIsRulebookOpen(false);
      setIsMultiplayerModalOpen(false);
      scratchpad.setNoteModalStationId(null);
      board.resetInteraction(false);
    },
    onFocusStation: setFocusStationId,
    onToggleScratchpad: scratchpad.toggleEnabled,
    onToggleMute: toggleMute,
    onToggleRulebook: () => setIsRulebookOpen((prev) => !prev)
  });

  useGameAudioCues({
    isMounted,
    currentRound: gameState.currentRound,
    surfacingRounds: activeMap.surfacingRounds,
    status: gameState.status
  });

  const isAIThinking = useAiTurns({
    isMounted,
    currentScreen,
    isReplayActive: replay.isReplayActive,
    gameMode,
    activeRole,
    status: gameState.status,
    localSetup,
    engine,
    ai: local.ai,
    bump: local.bump
  });

  // Clears per-match UI state whenever a fresh engine is created
  const resetMatchUi = useCallback(() => {
    board.resetInteraction();
    scratchpad.setPins({});
    replay.setIsReplayActive(false);
    setShowVictoryModal(true);
    setShowShield(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.resetInteraction, scratchpad.setPins, replay.setIsReplayActive]);

  // Reset or Start New Match with Config
  const handleNewGame = useCallback(() => {
    rebuildEngine();
    resetMatchUi();
  }, [rebuildEngine, resetMatchUi]);

  const displayState = useMemo(
    () =>
      getDisplayState({
        engine,
        gameState,
        gameMode,
        activeRole,
        localSetup,
        isReplayActive: replay.isReplayActive
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engine, activeRole, localSetup, gameState, local.revision, gameMode, replay.isReplayActive]
  );

  const leaveMultiplayer = (toTitle: boolean) => {
    socket.leaveRoom();
    setGameMode("single_player");
    if (toTitle) setCurrentScreen("title");
  };
  const closeMultiplayerModal = () => {
    setIsMultiplayerModalOpen(false);
    if (!socket.roomCode) setGameMode("single_player");
  };
  const sharedModals = (
    <SharedModals
      socket={socket}
      isMultiplayerModalOpen={isMultiplayerModalOpen}
      initialJoinCode={initialJoinCode}
      onCloseMultiplayerModal={closeMultiplayerModal}
      isSettingsOpen={isSettingsOpen}
      onCloseSettings={() => setIsSettingsOpen(false)}
      isRulebookOpen={isRulebookOpen}
      onCloseRulebook={() => setIsRulebookOpen(false)}
      onNewGame={handleNewGame}
    />
  );

  // If in multiplayer and in lobby state, render the LobbyView
  if (gameMode === "multiplayer" && socket.lobbyState && socket.lobbyState.status === "lobby") {
    return (
      <LobbyView
        lobbyState={socket.lobbyState}
        myRole={socket.myRole}
        myRoles={socket.myRoles}
        isHost={socket.isHost}
        onClaimRole={socket.claimRole}
        onUpdateConfig={socket.updateConfig}
        onStartGame={socket.startGame}
        onLeaveRoom={() => leaveMultiplayer(true)}
      />
    );
  }

  const hasActiveGame = engine.state.moveHistory.length > 0 && engine.state.status === "in_progress";

  if (currentScreen === "title") {
    return (
      <>
        <TitleScreen
          hasActiveGame={hasActiveGame}
          onNewGame={() => setCurrentScreen("setup")}
          onResumeGame={() => setCurrentScreen("game")}
          onOpenMultiplayer={() => {
            setGameMode("multiplayer");
            setIsMultiplayerModalOpen(true);
          }}
          onOpenRulebook={() => setIsRulebookOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        {sharedModals}
      </>
    );
  }

  if (currentScreen === "setup") {
    return (
      <GameSetupScreen
        onBack={() => setCurrentScreen("title")}
        onLaunchGame={(setup) => {
          setLocalSetup(setup);
          setGameMode(setup.gameMode === "pass_and_play" ? "pass_and_play" : "single_player");
          local.launchFromSetup(setup);
          resetMatchUi();
          setCurrentScreen("game");
        }}
      />
    );
  }

  return (
    <main
      className="relative w-screen h-screen flex flex-col bg-noir-950 overflow-hidden font-sans"
      suppressHydrationWarning
    >
      <GameHeader
        activeMap={activeMap}
        hasMoves={engine.state.moveHistory.length > 0}
        isReplayActive={replay.isReplayActive}
        onToggleReplay={() => {
          replay.setIsReplayActive(!replay.isReplayActive);
          replay.setCurrentReplayRound(engine.state.currentRound);
        }}
        selectedCityId={local.selectedCityId}
        onCityChange={local.changeCity}
        difficulty={local.difficulty}
        onDifficultyChange={local.setDifficulty}
        tacticalModeEnabled={local.tacticalModeEnabled}
        onToggleTactical={() => {
          local.setTacticalModeEnabled(!local.tacticalModeEnabled);
          handleNewGame();
        }}
        gameMode={gameMode}
        onSelectMode={(mode) => {
          setGameMode(mode);
          if (mode === "multiplayer" && !socket.roomCode) setIsMultiplayerModalOpen(true);
        }}
        roomCode={socket.roomCode}
        myRole={socket.myRole}
        timerSeconds={socket.timerSeconds}
        onLeaveRoom={() => leaveMultiplayer(false)}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onMenu={() => setCurrentScreen("title")}
        onNewMatch={handleNewGame}
        onOpenRulebook={() => setIsRulebookOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Turn Banner */}
      <TurnBanner
        gameState={gameState}
        surfacingRounds={activeMap.surfacingRounds}
        reachableCount={board.reachableStationIds.length}
      />

      {/* Travel Log Ribbon */}
      <TravelLogHUD
        currentRound={gameState.currentRound}
        maxRounds={gameState.config.maxRounds}
        surfacingRounds={activeMap.surfacingRounds}
        travelLog={gameState.misterXTravelLog}
        onSelectStation={setFocusStationId}
      />

      <GameBoardStage
        activeMap={activeMap}
        gameState={gameState}
        displayState={displayState}
        activeRole={activeRole}
        reachableStationIds={board.reachableStationIds}
        focusStationId={focusStationId}
        onFocusStation={setFocusStationId}
        onStationClick={board.handleStationClick}
        viewerRole={getViewerRole({
          gameMode,
          activeRole,
          localSetup,
          myRole: socket.myRole,
          myRoles: socket.myRoles
        })}
        possibilityCloudStations={deductionResult.candidateStationIds}
        showPossibilityCloud={showPossibilityCloud}
        onTogglePossibilityCloud={() => setShowPossibilityCloud((prev) => !prev)}
        lastSurfacedStation={deductionResult.lastSurfacedStation}
        lastSurfacedRound={deductionResult.lastSurfacedRound}
        isAIThinking={isAIThinking}
        isReplayActive={replay.isReplayActive}
        replayMisterXStation={replay.replayMisterXStation}
        replayTrajectory={replay.replayTrajectory}
        moveHistory={engine.state.moveHistory}
        currentReplayRound={replay.currentReplayRound}
        replayMaxRounds={Math.max(1, engine.state.currentRound)}
        nearMissCount={replay.nearMissCount}
        onSetReplayRound={replay.setCurrentReplayRound}
        onCloseReplay={() => replay.setIsReplayActive(false)}
        tacticalModeEnabled={local.tacticalModeEnabled}
        targetingMode={board.targetingMode}
        onSetTargetingMode={board.setTargetingMode}
        onActivateDecoy={board.handleActivateDecoy}
        lastRadarResult={board.lastRadarResult}
        pins={scratchpad.pins}
        scratchpadEnabled={scratchpad.enabled}
        onToggleScratchpad={scratchpad.toggleEnabled}
        onExitScratchpad={() => scratchpad.setEnabled(false)}
        activePinType={scratchpad.activePinType}
        onSelectPinType={scratchpad.setActivePinType}
        onClearAllPins={scratchpad.clearAll}
      />

      <GameModals
        activePlayer={activePlayer}
        targetStationId={board.targetStationId}
        availableTicketsForMove={board.availableTicketsForMove}
        isDoubleMoveActive={gameState.doubleMoveActive || false}
        onConfirmMove={board.handleConfirmMove}
        onCancelMove={() => board.setTargetStationId(null)}
        noteModalStationId={scratchpad.noteModalStationId}
        pins={scratchpad.pins}
        onSaveNote={scratchpad.saveNote}
        onDeleteNote={scratchpad.deleteNote}
        onCloseNote={() => scratchpad.setNoteModalStationId(null)}
        winInfo={gameState.winInfo}
        showVictoryModal={showVictoryModal}
        onPlayAgain={handleNewGame}
        onInspectBoard={() => setShowVictoryModal(false)}
        onViewReplay={() => {
          setShowVictoryModal(false);
          replay.setIsReplayActive(true);
          replay.setCurrentReplayRound(1);
        }}
        showShield={showShield}
        onDismissShield={() => setShowShield(false)}
      />

      {sharedModals}
    </main>
  );
}
