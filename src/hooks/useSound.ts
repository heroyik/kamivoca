"use client";

import { useRef, useEffect, useCallback } from "react";

type SoundType = "correct" | "incorrect" | "cheer";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/kamivoca";

const SOUND_FILES: Record<string, string> = {
  correct: `${BASE_PATH}/sounds/correct.mp3`,
  incorrect: `${BASE_PATH}/sounds/incorrect.mp3`,
  cheer1: `${BASE_PATH}/sounds/cheer1.mp3`,
  cheer2: `${BASE_PATH}/sounds/cheer2.mp3`,
  cheer3: `${BASE_PATH}/sounds/cheer3.mp3`,
  cheer4: `${BASE_PATH}/sounds/cheer4.mp3`,
  cheer5: `${BASE_PATH}/sounds/cheer5.mp3`,
};

/**
 * WebAudio API-based sound hook for maximum browser compatibility.
 * 
 * Strategy:
 * - Use AudioContext + fetch/decodeAudioData (works on all browsers incl. Safari macOS/iOS).
 * - Prefixes assets with BASE_PATH to avoid 404s.
 * - AudioContext must be resumed inside a user gesture handler for Safari.
 */
/**
 * Global Singleton for Audio state to persist across page navigations.
 * This ensures sounds are only loaded once and are ready immediately.
 */
let globalCtx: AudioContext | null = null;
const globalBuffers: Record<string, AudioBuffer> = {};
let globalUnlocked = false;
let isPreloadingStarted = false;

const getGlobalContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!globalCtx) {
    const AC =
      window.AudioContext ||
      (window as any).webkitAudioContext;
    if (!AC) return null;
    globalCtx = new AC();
  }
  return globalCtx;
};

const preloadAllBuffers = async () => {
  if (isPreloadingStarted) return;
  isPreloadingStarted = true;

  const ctx = getGlobalContext();
  if (!ctx) return;

  await Promise.allSettled(
    Object.entries(SOUND_FILES).map(async ([key, src]) => {
      if (globalBuffers[key]) return;
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuf = await res.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        globalBuffers[key] = audioBuf;
        console.log(`[useSound] Preloaded: ${key}`);
      } catch (err) {
        console.warn(`[useSound] Failed to preload ${key}:`, err);
      }
    })
  );
};

// Start preloading immediately if in browser
if (typeof window !== "undefined") {
  preloadAllBuffers();
}

/**
 * WebAudio API-based sound hook for maximum browser compatibility.
 */
export function useSound(enabled: boolean) {
  // We still use a ref for local tracking inside the component if needed,
  // but rely on global state for the heavy lifting.
  
  const unlock = useCallback(async () => {
    const ctx = getGlobalContext();
    if (!ctx) return;

    // Resume context within user gesture (CRITICAL for Safari)
    if (ctx.state !== "running") {
      await ctx.resume().catch((e) => console.warn("[useSound] Resume failed:", e));
    }

    if (!globalUnlocked) {
      globalUnlocked = true;
      console.log("[useSound] AudioContext Unlocked");
      // Re-trigger buffer loading just in case it missed the context window
      preloadAllBuffers();
    }
  }, []);

  useEffect(() => {
    const handleGesture = () => {
      unlock();
    };

    // Use multiple events for capture
    document.addEventListener("touchstart", handleGesture, { once: false, passive: true });
    document.addEventListener("mousedown", handleGesture, { once: false });
    document.addEventListener("click", handleGesture, { once: false });

    return () => {
      document.removeEventListener("touchstart", handleGesture);
      document.removeEventListener("mousedown", handleGesture);
      document.removeEventListener("click", handleGesture);
    };
  }, [unlock]);

  const play = useCallback(
    async (type: SoundType) => {
      if (!enabled) return;

      let key: string = type;
      if (type === "cheer") {
        const n = Math.floor(Math.random() * 5) + 1;
        key = `cheer${n}`;
      }

      try {
        const ctx = getGlobalContext();
        if (!ctx) return;

        // Auto-resume fallback (essential for some mobile browsers)
        if (ctx.state !== "running") {
          await ctx.resume().catch(() => {});
        }

        const buffer = globalBuffers[key];
        if (!buffer) {
          console.warn(`[useSound] Skipping play - ${key} not buffered yet.`);
          preloadAllBuffers(); // Lazy-retry
          return;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gain = ctx.createGain();
        gain.gain.value = 0.85;

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
      } catch (err) {
        console.warn(`[useSound] play failed (${key}):`, err);
      }
    },
    [enabled]
  );

  return { play };
}
