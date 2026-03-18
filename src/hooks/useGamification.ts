"use client";

import { useGamificationContext, UserStats, VocabOverridePatch } from "@/contexts/GamificationContext";

export type { UserStats, VocabOverridePatch };

export function useGamification() {
  const context = useGamificationContext();
  
  // Map context to existing hook interface for backward compatibility
  return {
    user: context.user,
    globalDeletedWordKeys: context.globalDeletedWordKeys,
    manualCogniteIds: context.manualCogniteIds,
    vocabEntries: context.vocabEntries,
    stats: context.stats,
    isInitialized: context.isInitialized,
    isOnline: context.isOnline,
    isOfflineMode: context.isOfflineMode,
    isOfflineModeBlocked: context.isOfflineModeBlocked,
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
    deleteWordsGlobally: context.deleteWordsGlobally,
    saveVocabOverride: context.saveVocabOverride,
    clearVocabOverride: context.clearVocabOverride,
    resetProgress: context.resetProgress,
    resetLocalState: context.resetLocalState
  };
}
