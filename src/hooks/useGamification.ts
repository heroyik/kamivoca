"use client";

import { useGamificationContext, UserStats } from "@/contexts/GamificationContext";

export type { UserStats };

export function useGamification() {
  const context = useGamificationContext();
  
  // Map context to existing hook interface for backward compatibility
  return {
    user: context.user,
    globalDeletedWordKeys: context.globalDeletedWordKeys,
    manualCogniteIds: context.manualCogniteIds,
    stats: context.stats,
    isInitialized: context.isInitialized,
    addXP: context.addXP,
    addGem: context.addGem,
    completeUnit: context.completeUnit,
    unlockProgress: context.unlockProgress,
    recordMistake: context.recordMistake,
    addMistake: context.addMistake,
    clearMistake: context.clearMistake,
    removeMistake: context.removeMistake,
    clearAllMistakes: context.clearAllMistakes,
    updateSettings: context.updateSettings,
    updateProfile: context.updateProfile,
    markManualCognite: context.markManualCognite,
    removeManualCognite: context.removeManualCognite,
    clearAllManualCognites: context.clearAllManualCognites,
    resetProgress: context.resetProgress,
    resetLocalState: context.resetLocalState
  };
}
