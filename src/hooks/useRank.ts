"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface RankResult {
  rank: number;
  total: number;
}

/**
 * Fetches the current user's rank from Firestore leaderboard.
 * Session-cached and refreshed after unit completion.
 * Returns { rank, total, prevRank, refresh }.
 */
export function useRank(myUid: string | null, myXP: number) {
  const [rank, setRank] = useState<number | null>(null);
  const [total, setTotal] = useState<number>(0);
  const prevRankRef = useRef<number | null>(null);
  const [rankDelta, setRankDelta] = useState<number | null>(null);

  const fetchRank = useCallback(async () => {
    if (!db || !myUid) return;
    try {
      // Fetch top 200 by XP — enough for rank calculation without excessive reads
      const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(200));
      const snap = await getDocs(q);
      const entries = snap.docs.map((d) => ({ id: d.id, xp: (d.data().xp as number) || 0 }));

      const myIdx = entries.findIndex((e) => e.id === myUid);
      const myRank = myIdx === -1
        ? entries.filter((e) => e.xp > myXP).length + 1  // Fallback: count higher XP
        : myIdx + 1;

      setTotal(snap.size);
      const prev = prevRankRef.current;
      if (prev !== null && myRank < prev) {
        setRankDelta(prev - myRank); // improved by this many spots
      } else {
        setRankDelta(null);
      }
      prevRankRef.current = myRank;
      setRank(myRank);
    } catch (e) {
      console.warn("[useRank] fetch failed:", e);
    }
  }, [myUid, myXP]);

  useEffect(() => {
    // Calling fetchRank asynchronously via micro-task to avoid cascading render warning
    // as it might be called repeatedly during initialization in some React versions.
    const runFetch = async () => {
      await fetchRank();
    };
    runFetch();
  }, [fetchRank]);

  const clearDelta = useCallback(() => setRankDelta(null), []);

  return { rank, total, rankDelta, refresh: fetchRank, clearDelta } as RankResult & {
    rankDelta: number | null;
    refresh: () => Promise<void>;
    clearDelta: () => void;
  };
}
