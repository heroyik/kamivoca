"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/lib/constants";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, {
          scope: `${BASE_PATH}/`,
        });
      } catch (error) {
        console.warn("[SW] registration failed", error);
      }
    };

    void register();
  }, []);

  return null;
}
