"use client";

import { useState, useMemo, useCallback } from "react";
import { MisterXAI } from "@scotland-yard/common";
import type { GameEngine } from "@scotland-yard/common";
import type { LocalMatchSetup } from "../components/screens/GameSetupScreen";
import { createLocalEngine, applyPlayerNames } from "../lib/localMatch";
import type { Difficulty } from "../lib/localMatch";

/**
 * Owns the local engine (single-player / pass-and-play), its revision counter
 * and the match configuration used to (re)create it.
 */
export function useLocalGame() {
  const [selectedCityId, setSelectedCityId] = useState<string>("london");
  const [difficulty, setDifficulty] = useState<Difficulty>("classic");
  const [tacticalModeEnabled, setTacticalModeEnabled] = useState<boolean>(true);

  const [engine, setEngine] = useState<GameEngine>(() =>
    createLocalEngine("london", "classic", true)
  );
  // State revision trigger to force re-render on engine state mutations
  const [revision, setRevision] = useState(0);
  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const ai = useMemo(() => new MisterXAI(engine.graph), [engine]);

  /** Re-creates the engine from the current configuration. */
  const rebuildEngine = useCallback(() => {
    setEngine(createLocalEngine(selectedCityId, difficulty, tacticalModeEnabled));
    bump();
  }, [selectedCityId, difficulty, tacticalModeEnabled, bump]);

  /** Switch city (header selector): new engine for that city, config otherwise unchanged. */
  const changeCity = useCallback(
    (cityId: string) => {
      setSelectedCityId(cityId);
      setEngine(createLocalEngine(cityId, difficulty, tacticalModeEnabled));
      bump();
    },
    [difficulty, tacticalModeEnabled, bump]
  );

  /** Start a match from the setup screen. */
  const launchFromSetup = useCallback(
    (setup: LocalMatchSetup) => {
      setSelectedCityId(setup.cityId);
      setDifficulty(setup.difficulty);
      setTacticalModeEnabled(setup.tacticalMode);
      const newEngine = createLocalEngine(setup.cityId, setup.difficulty, setup.tacticalMode);
      applyPlayerNames(newEngine, setup);
      setEngine(newEngine);
      bump();
    },
    [bump]
  );

  return {
    engine,
    revision,
    bump,
    ai,
    selectedCityId,
    difficulty,
    setDifficulty,
    tacticalModeEnabled,
    setTacticalModeEnabled,
    rebuildEngine,
    changeCity,
    launchFromSetup
  };
}
