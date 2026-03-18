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
        const registration = await navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, {
          scope: `${BASE_PATH}/`,
        });
        if (registration.active || registration.waiting || registration.installing) {
          document.documentElement.dataset.offlineReady = "true";
        }
      } catch (error) {
        console.warn("[SW] registration failed", error);
        document.documentElement.dataset.offlineReady = "false";
      }
    };

    void register();
  }, []);

  return null;
}
