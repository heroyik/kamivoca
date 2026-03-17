"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot, updateDoc, collection, serverTimestamp, increment, deleteDoc, getDocs, writeBatch, deleteField } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import vocabData from "@/data/vocab.json";
import { normalizeVocabWordKey, VocabEntry } from "@/utils/vocab";

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
  globalDeletedWordKeys: string[];
  manualCogniteIds: string[];
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
  markManualCognite: (entryId: string) => Promise<void>;
  removeManualCognite: (entryId: string) => Promise<void>;
  clearAllManualCognites: () => Promise<void>;
  deleteWordsGlobally: (entryIds: string[]) => Promise<void>;
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
  const [globalDeletedWordKeys, setGlobalDeletedWordKeys] = useState<string[]>([]);
  const [manualCogniteIds, setManualCogniteIds] = useState<string[]>([]);
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

  useEffect(() => {
    if (!db) {
      setTimeout(() => setGlobalDeletedWordKeys([]), 0);
      return;
    }

    const deletedWordsCollection = collection(db, "adminDeletedWords");
    const unsubscribe = onSnapshot(
      deletedWordsCollection,
      (snapshot) => {
        const nextKeys = snapshot.docs.map((docSnap) => docSnap.id);
        setGlobalDeletedWordKeys(nextKeys);
      },
      (error) => {
        console.error("[GamificationProvider] Global deleted word sync failed", error);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user) {
      setTimeout(() => setManualCogniteIds([]), 0);
      return;
    }

    const entries = vocabData.data as VocabEntry[];
    const idsByWordKey = new Map<string, string[]>();
    entries.forEach((entry) => {
      const wordKey = normalizeVocabWordKey(entry.word);
      const ids = idsByWordKey.get(wordKey) ?? [];
      ids.push(entry.id);
      idsByWordKey.set(wordKey, ids);
    });

    const cogniteCollection = collection(db, "users", user.uid, "manualCognites");
    const unsubscribe = onSnapshot(cogniteCollection, (snapshot) => {
      const nextIds = new Set<string>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as { word?: string; wordKey?: string };
        const wordKey = data.wordKey || (data.word ? normalizeVocabWordKey(data.word) : docSnap.id);
        const matchingIds = idsByWordKey.get(wordKey) ?? [];
        matchingIds.forEach((id) => nextIds.add(id));
      });
      setManualCogniteIds(Array.from(nextIds));
    }, (error) => {
      console.error("[GamificationProvider] Manual cognite sync failed", error);
    });

    return () => unsubscribe();
  }, [user]);

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
      setDoc(wordRef, { failCount: increment(1), word: word }, { merge: true })
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

  const getEntriesByWordKey = () => {
    const map = new Map<string, VocabEntry[]>();
    (vocabData.data as VocabEntry[]).forEach((entry) => {
      const wordKey = normalizeVocabWordKey(entry.word);
      const entries = map.get(wordKey) ?? [];
      entries.push(entry);
      map.set(wordKey, entries);
    });
    return map;
  };

  const chunkItems = <T,>(items: T[], size: number) => {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  };

  const deleteManualCognitesAcrossUsers = async (firestore: NonNullable<typeof db>, wordKeys: string[]) => {
    if (wordKeys.length === 0) return;

    const userSnapshot = await getDocs(collection(firestore, "users"));
    const deleteRefs = userSnapshot.docs.flatMap((userDoc) =>
      wordKeys.map((wordKey) => doc(firestore, "users", userDoc.id, "manualCognites", wordKey)),
    );

    for (const refs of chunkItems(deleteRefs, 400)) {
      const batch = writeBatch(firestore);
      refs.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  };

  const clearLegacyCogniteFlags = async (wordKey: string) => {
    if (!db) return;
    const firestore = db;

    const entriesByWordKey = getEntriesByWordKey();
    const matchingEntries = entriesByWordKey.get(wordKey) ?? [];
    if (matchingEntries.length === 0) return;

    const batch = writeBatch(firestore);
    matchingEntries.forEach((entry) => {
      batch.set(doc(firestore, "vocabEntries", entry.id), {
        is_cognite: deleteField(),
        cogniteUpdatedAt: deleteField(),
      }, { merge: true });
    });
    await batch.commit();
  };

  const markWordGloballyDeleted = async (entry: VocabEntry) => {
    if (!db || !user) return;

    const wordKey = normalizeVocabWordKey(entry.word);

    await setDoc(doc(db, "adminDeletedWords", wordKey), {
      word: entry.word,
      wordKey,
      deletedByUid: user.uid,
      deletedByEmail: user.email ?? null,
      deletedAt: serverTimestamp(),
    }, { merge: true });

    const deleteBatch = writeBatch(db);
    deleteBatch.delete(doc(db, "vocabEntries", entry.id));
    deleteBatch.delete(doc(db, "fullVocaEntries", entry.id));
    await deleteBatch.commit();

    await deleteManualCognitesAcrossUsers(db, [wordKey]);

    await clearLegacyCogniteFlags(wordKey);
  };

  const deleteWordsGlobally = async (entryIds: string[]) => {
    if (!db || !user || user.email !== "heroyik@gmail.com") {
      console.warn("[GamificationProvider] Admin-only global delete rejected");
      return;
    }
    const firestore = db;

    const entriesById = new Map((vocabData.data as VocabEntry[]).map((entry) => [entry.id, entry]));
    const entriesByWordKey = getEntriesByWordKey();
    const selectedEntries = entryIds
      .map((entryId) => entriesById.get(entryId))
      .filter((entry): entry is VocabEntry => Boolean(entry));

    if (selectedEntries.length === 0) return;

    const uniqueWordKeys = Array.from(
      new Set(selectedEntries.map((entry) => normalizeVocabWordKey(entry.word))),
    );

    for (const wordKey of uniqueWordKeys) {
      const sourceEntry = entriesByWordKey.get(wordKey)?.[0];
      await setDoc(doc(firestore, "adminDeletedWords", wordKey), {
        word: sourceEntry?.word ?? null,
        wordKey,
        deletedByUid: user.uid,
        deletedByEmail: user.email ?? null,
        deletedAt: serverTimestamp(),
      }, { merge: true });
    }

    const deleteRefs = uniqueWordKeys.flatMap((wordKey) =>
      (entriesByWordKey.get(wordKey) ?? []).flatMap((entry) => [
        doc(firestore, "vocabEntries", entry.id),
        doc(firestore, "fullVocaEntries", entry.id),
      ]),
    );

    for (const refs of chunkItems(deleteRefs, 400)) {
      const batch = writeBatch(firestore);
      refs.forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    await deleteManualCognitesAcrossUsers(firestore, uniqueWordKeys);

    await Promise.all(uniqueWordKeys.map((wordKey) => clearLegacyCogniteFlags(wordKey)));
    setManualCogniteIds((prev) =>
      prev.filter((entryId) => {
        const entry = entriesById.get(entryId);
        return !entry || !uniqueWordKeys.includes(normalizeVocabWordKey(entry.word));
      }),
    );
    setGlobalDeletedWordKeys((prev) => Array.from(new Set([...prev, ...uniqueWordKeys])));
  };

  const markManualCognite = async (entryId: string) => {
    if (!db || !user) {
      console.warn("[GamificationProvider] Firestore is not available for manual cognites");
      return;
    }

    const entries = vocabData.data as VocabEntry[];
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) {
      console.warn("[GamificationProvider] Could not resolve cognite word for entry:", entryId);
      return;
    }

    const wordKey = normalizeVocabWordKey(entry.word);
    await setDoc(doc(db, "users", user.uid, "manualCognites", wordKey), {
      entryId,
      word: entry.word,
      wordKey,
      cogniteUpdatedAt: serverTimestamp(),
    });

    setManualCogniteIds((prev) => (prev.includes(entryId) ? prev : [...prev, entryId]));
  };

  const removeManualCognite = async (entryId: string) => {
    if (!db || !user) {
      console.warn("[GamificationProvider] Firestore is not available for manual cognites");
      return;
    }

    const entries = vocabData.data as VocabEntry[];
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) {
      console.warn("[GamificationProvider] Could not resolve cognite word for entry:", entryId);
      return;
    }

    const wordKey = normalizeVocabWordKey(entry.word);
    await deleteDoc(doc(db, "users", user.uid, "manualCognites", wordKey));
    if (user.email === "heroyik@gmail.com") {
      await markWordGloballyDeleted(entry);
    } else {
      await clearLegacyCogniteFlags(wordKey);
    }
    setManualCogniteIds((prev) => prev.filter((id) => id !== entryId));
  };

  const clearAllManualCognites = async () => {
    if (!db || !user) {
      console.warn("[GamificationProvider] Firestore is not available for manual cognites");
      return;
    }

    const cogniteCollection = collection(db, "users", user.uid, "manualCognites");
    const snapshot = await getDocs(cogniteCollection);
    if (snapshot.empty) {
      setManualCogniteIds([]);
      return;
    }

    const wordKeys = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as { word?: string; wordKey?: string };
      return data.wordKey || (data.word ? normalizeVocabWordKey(data.word) : docSnap.id);
    });

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    if (user.email === "heroyik@gmail.com") {
      const entriesByWordKey = getEntriesByWordKey();
      await Promise.all(
        wordKeys.flatMap((wordKey) => (entriesByWordKey.get(wordKey) ?? []).map((entry) => markWordGloballyDeleted(entry))),
      );
    } else {
      await Promise.all(wordKeys.map((wordKey) => clearLegacyCogniteFlags(wordKey)));
    }
    setManualCogniteIds([]);
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
      globalDeletedWordKeys,
      manualCogniteIds,
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
      markManualCognite,
      removeManualCognite,
      clearAllManualCognites,
      deleteWordsGlobally,
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
