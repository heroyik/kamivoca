"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot, increment, setDoc as fsSetDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface UserStats {
  xp: number;
  gems: number;
  streak: number;
  lastStudyDate: string | null;
  completedUnits: string[];
  masteredUnits: string[]; // Units completed with 0 mistakes
  mistakes: Record<string, number>;
  unitStats?: Record<string, {
    failedWords: number;
    attempts: number;
    isMastered: boolean;
  }>;
  displayName?: string;
  photoURL?: string;
  settings?: {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    hideFurigana: boolean;
    unlockAllLevels: boolean;
    hideEasyCognates: boolean;
  };
}

interface GamificationContextType {
  user: User | null;
  stats: UserStats;
  isInitialized: boolean;
  addXP: (amount: number) => void;
  completeUnit: (unitId: string, xpEarned?: number, isPerfect?: boolean) => void;
  unlockProgress: (unitIds: string[], xp?: number, gems?: number) => void;
  recordMistake: (word: string, unitId?: string) => void;
  addMistake: (word: string, unitId?: string) => void;
  clearMistake: (word: string) => void;
  removeMistake: (word: string) => void;
  clearAllMistakes: () => void;
  addGem: (amount: number) => void;
  updateSettings: (settings: Partial<NonNullable<UserStats['settings']>>) => void;
  updateProfile: (profile: Partial<Pick<UserStats, 'displayName' | 'photoURL'>>) => void;
  resetProgress: () => void;
  resetLocalState: () => void;
}



const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

const defaultStats: UserStats = {
  xp: 0,
  gems: 0,
  streak: 0,
  lastStudyDate: null,
  completedUnits: [],
  masteredUnits: [],
  mistakes: {},
  unitStats: {},
  settings: {
    soundEnabled: true,
    hapticsEnabled: true,
    hideFurigana: false,
    unlockAllLevels: false,
    hideEasyCognates: false,
  },
};

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Client-side hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("kamivoca_stats");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Use setTimeout to avoid setState synchronously in effect (cascading renders)
          setTimeout(() => {
            setStats(prev => ({
              ...prev,
              ...parsed,
              mistakes: parsed.mistakes || {},
              unitStats: parsed.unitStats || {},
              settings: {
                ...defaultStats.settings,
                ...(parsed.settings || {}),
              }
            }));
          }, 0);
        } catch (e) {
          console.error("Failed to parse local stats", e);
        }
      }
    }
  }, []);

  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Auth & Firestore Listener
  useEffect(() => {
    if (!auth) {
      console.warn("Firebase Auth is not available. Using Guest Mode.");
      setTimeout(() => setIsInitialized(true), 0);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log("[GamificationProvider] Auth State Changed:", currentUser?.uid || "Guest");
      setUser(currentUser);
      
      // Cleanup previous snapshot listener if it exists
      if (unsubscribeRef.current) {
        console.log("[GamificationProvider] Cleaning up old Firestore listener");
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (currentUser && db) {
        const userDocRef = doc(db, "users", currentUser.uid);
        console.log("[GamificationProvider] Starting Firestore sync for:", currentUser.uid);
        unsubscribeRef.current = onSnapshot(userDocRef, (snapshot) => {
          if (snapshot.exists()) {
            console.log("[GamificationProvider] User document found in Firestore");
            setStats(prev => {
              if (snapshot.metadata.hasPendingWrites) return prev;

              const cloudData = snapshot.data() as UserStats;

              const newStats: UserStats = {
                ...prev,
                ...cloudData,
                xp: cloudData.xp ?? 0,
                gems: cloudData.gems ?? 0,
                streak: cloudData.streak ?? 0,
                lastStudyDate: cloudData.lastStudyDate ?? null,
                completedUnits: cloudData.completedUnits || [],
                masteredUnits: cloudData.masteredUnits || [],
                mistakes: cloudData.mistakes || {},
                unitStats: cloudData.unitStats || {},
                settings: {
                  soundEnabled: cloudData.settings?.soundEnabled ?? prev.settings?.soundEnabled ?? defaultStats.settings!.soundEnabled,
                  hapticsEnabled: cloudData.settings?.hapticsEnabled ?? prev.settings?.hapticsEnabled ?? defaultStats.settings!.hapticsEnabled,
                  hideFurigana: cloudData.settings?.hideFurigana ?? prev.settings?.hideFurigana ?? defaultStats.settings!.hideFurigana,
                  unlockAllLevels: cloudData.settings?.unlockAllLevels ?? prev.settings?.unlockAllLevels ?? defaultStats.settings!.unlockAllLevels,
                  hideEasyCognates: cloudData.settings?.hideEasyCognates ?? prev.settings?.hideEasyCognates ?? defaultStats.settings!.hideEasyCognates,
                },
              };

              setIsInitialized(true);
              return newStats;
            });
          } else {
            console.log("[GamificationProvider] User document NOT found (new user)");
            setIsInitialized(true);
          }
        }, (error) => {
          console.error("[GamificationProvider] Snapshot error:", error);
          setIsInitialized(true);
        });
      } else {
        console.log("[GamificationProvider] No user or DB available (Guest mode)");
        setIsInitialized(true);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const syncStatsToCloud = async (newStats: UserStats, isDeletion: boolean = false) => {
    if (!user || !db || !isInitialized) return;

    try {
      const userDocRef = doc(db, "users", user.uid);
      
      const dataToSync = {
        ...newStats,
        displayName: user.displayName || newStats.displayName,
        // Google auth photo always takes priority in Firestore (for leaderboard display)
        photoURL: user.photoURL || newStats.photoURL || null,
      };

      if (isDeletion) {
        // Using updateDoc with the whole object replaces top-level fields 
        // including the entire 'mistakes' map, which fulfills our deletion need.
        await updateDoc(userDocRef, dataToSync);
      } else {
        await setDoc(userDocRef, dataToSync, { merge: true });
      }
      console.log("[GamificationProvider] Progress synced to cloud");
    } catch (e) {
      console.error("[GamificationProvider] Cloud sync failed", e);
    }
  };

  const saveStatsLocally = (newStats: UserStats, isDeletion: boolean = false) => {
    setStats(newStats);
    localStorage.setItem("kamivoca_stats", JSON.stringify(newStats));
    syncStatsToCloud(newStats, isDeletion);
  };

  const resetLocalState = () => {
    statsRef.current = defaultStats;
    setStats(defaultStats);
    setUser(null);
    setIsInitialized(true);

    if (typeof window !== "undefined") {
      localStorage.removeItem("kamivoca_stats");
      localStorage.removeItem("weather_cache");
    }
  };

  const addXP = (amount: number) => {
    saveStatsLocally({ ...statsRef.current, xp: statsRef.current.xp + amount });
  };

  const addGem = (amount: number) => {
    saveStatsLocally({ ...statsRef.current, gems: statsRef.current.gems + amount });
  };

  const completeUnit = (unitId: string, xpEarned: number = 0, isPerfect: boolean = false) => {
    const today = new Date().toISOString().split('T')[0];
    let newStreak = statsRef.current.streak;

    if (statsRef.current.lastStudyDate !== today) {
      newStreak += 1;
    }

    const currentCompleted = statsRef.current.completedUnits || [];
    const currentMastered = statsRef.current.masteredUnits || [];

    const currentUnitStats = statsRef.current.unitStats?.[unitId] || { failedWords: 0, attempts: 0, isMastered: false };

    const newStats: UserStats = {
      ...statsRef.current,
      xp: statsRef.current.xp + xpEarned,
      gems: statsRef.current.gems + Math.floor(xpEarned / 10) + (isPerfect ? 25 : 0),
      streak: newStreak,
      lastStudyDate: today,
      completedUnits: currentCompleted.includes(unitId)
        ? currentCompleted
        : [...currentCompleted, unitId],
      masteredUnits: isPerfect && !currentMastered.includes(unitId)
        ? [...currentMastered, unitId]
        : currentMastered,
      unitStats: {
        ...(statsRef.current.unitStats || {}),
        [unitId]: {
          ...currentUnitStats,
          attempts: currentUnitStats.attempts + 1,
          isMastered: isPerfect || currentUnitStats.isMastered,
        }
      }
    };
    saveStatsLocally(newStats);
  };

  const unlockProgress = (unitIds: string[], xp?: number, gems?: number) => {
    const newStats: UserStats = {
      ...statsRef.current,
      xp: xp ?? statsRef.current.xp,
      gems: gems ?? statsRef.current.gems,
      completedUnits: unitIds
    };
    saveStatsLocally(newStats);
  };

  const recordMistake = (wordParam: string, unitId?: string) => {
    const word = wordParam.trim();
    const currentMistakes = statsRef.current.mistakes || {};
    const newUnitStats = { ...(statsRef.current.unitStats || {}) };

    if (unitId) {
      const uStat = newUnitStats[unitId] || { failedWords: 0, attempts: 0, isMastered: false };
      newUnitStats[unitId] = {
        ...uStat,
        failedWords: uStat.failedWords + 1
      };
    }

    saveStatsLocally({
      ...statsRef.current,
      mistakes: {
        ...currentMistakes,
        [word]: (currentMistakes[word] || 0) + 1
      },
      unitStats: newUnitStats
    });

    // Fire-and-forget: increment global word fail count in Firestore
    if (db) {
      const wordRef = doc(db, "globalWordStats", encodeURIComponent(word));
      fsSetDoc(wordRef, { failCount: increment(1), word: word }, { merge: true })
        .catch((e) => console.warn("[GlobalStats] Failed to increment:", e));
    }
  };

  const clearMistake = async (wordParam: string) => {
    const word = wordParam.trim();
    const currentMistakes = { ...statsRef.current.mistakes };
    delete currentMistakes[word];

    const newStats = {
      ...statsRef.current,
      mistakes: currentMistakes
    };

    saveStatsLocally(newStats, true); // true indicates a deletion operation
    statsRef.current = newStats;
    console.log("[GamificationProvider] Mistake cleared:", word);
  };

  const clearAllMistakes = async () => {
    const newStats = {
      ...statsRef.current,
      mistakes: {}
    };

    saveStatsLocally(newStats, true);
    statsRef.current = newStats;
    console.log("[GamificationProvider] All mistakes cleared");
  };

  const updateSettings = (newSettings: Partial<NonNullable<UserStats['settings']>>) => {
    const updatedStats: UserStats = {
      ...statsRef.current,
      settings: {
        ...statsRef.current.settings!,
        ...newSettings,
      },
    };
    saveStatsLocally(updatedStats);
  };

  const updateProfile = (profile: Partial<Pick<UserStats, 'displayName' | 'photoURL'>>) => {
    const updatedStats: UserStats = {
      ...statsRef.current,
      ...profile,
    };
    saveStatsLocally(updatedStats);
  };

  const resetProgress = () => {
    const updatedStats: UserStats = {
      ...statsRef.current,
      streak: 0,
      lastStudyDate: null,
      completedUnits: [],
      masteredUnits: [],
      unitStats: {}, // Reset unit-specific attempts and mastery
    };
    saveStatsLocally(updatedStats);
  };

  return (
    <GamificationContext.Provider value={{
      user,
      stats,
      isInitialized,
      addXP,
      completeUnit,
      unlockProgress,
      recordMistake,
      addMistake: recordMistake,
      clearMistake,
      removeMistake: clearMistake,
      clearAllMistakes,
      addGem,
      updateSettings,
      updateProfile,
      resetProgress,
      resetLocalState
    }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamificationContext() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
}
