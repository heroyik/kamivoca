"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import vocabData from "@/data/vocab.json";
import { VocabEntry } from "@/utils/vocab";

export interface GlobalWordStat {
  word: string;
  meaning: string;
  furigana?: string;
  totalCount: number;
  book: string;   // "1" or "2"
  unitId: string; // "unit-X"
  unitNum: number;
}

// ── Unit lookup (mirrors getUnits logic from vocab.ts) ──────────────────────
function getDifficultyScore(word: string): number {
  let score = word.length * 10;
  // Increase score for Kanji (more complex) and Katakana
  if (/[\u4e00-\u9faf\u30a0-\u30ff]/.test(word)) score += 50;
  return score;
}

function normalizeWordKey(word: string): string {
  return word.toLowerCase().trim();
}

function buildWordUnitMap(): Map<string, { word: string; meaning: string; book: string; unitNum: number; furigana?: string }> {
  const uniqueWords = new Map<string, VocabEntry>();
  (vocabData.data as VocabEntry[]).forEach((w) => {
    const key = normalizeWordKey(w.word);
    if (!uniqueWords.has(key)) uniqueWords.set(key, w);
  });
  const allWords = Array.from(uniqueWords.values()).sort((a, b) => {
    const da = getDifficultyScore(a.word);
    const db = getDifficultyScore(b.word);
    return da !== db ? da - db : a.word.localeCompare(b.word);
  });

  const TOTAL_UNITS = 15;
  const unitSize = Math.ceil(allWords.length / TOTAL_UNITS);
  const map = new Map<string, { word: string; meaning: string; book: string; unitNum: number; furigana?: string }>();
  allWords.forEach((w, idx) => {
    map.set(normalizeWordKey(w.word), {
      word: w.word,
      meaning: w.meaning,
      book: w.jlpt,
      unitNum: Math.floor(idx / unitSize) + 1,
      furigana: w.furigana,
    });
  });
  return map;
}

const wordUnitMap = buildWordUnitMap();

// ── Session cache ────────────────────────────────────────────────────────────
let sessionCache: GlobalWordStat[] | null = null;

export function useGlobalTop20() {
  const [top20, setTop20] = useState<GlobalWordStat[]>(sessionCache || []);
  const [loading, setLoading] = useState(!sessionCache);
  const [error, setError] = useState<string | null>(null);

  const fetchTop20 = useCallback(async () => {
    if (sessionCache) setTop20(sessionCache);
    if (!db) { setLoading(false); return; }
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "globalWordStats"));
      const all: GlobalWordStat[] = snap.docs.map((d) => {
        const data = d.data();
        const rawWord: string = (data.word ?? decodeURIComponent(d.id) ?? "").trim();
        const meta = wordUnitMap.get(normalizeWordKey(rawWord)) ?? { word: rawWord, meaning: "", book: "N5", unitNum: 1 };
        return {
          word: meta.word || rawWord,
          meaning: data.meaning ?? meta.meaning ?? "",
          furigana: meta.furigana,
          totalCount: data.failCount ?? 0,
          book: meta.book,
          unitId: `unit-${meta.unitNum}`,
          unitNum: meta.unitNum,
        };
      });
      if (all.length === 0) {
        console.warn("[useGlobalTop20] No data found in globalWordStats");
        setTop20([]);
        return;
      }
      all.sort((a, b) => (b.totalCount - a.totalCount) || a.word.localeCompare(b.word));
      const result = all.slice(0, 20);
      sessionCache = result;
      setTop20(result);
    } catch (e) {
      console.error("[useGlobalTop20] fetch error", e);
      setError("Failed to load global stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTop20(); }, [fetchTop20]);

  return { top20, loading, error, refresh: fetchTop20 };
}
