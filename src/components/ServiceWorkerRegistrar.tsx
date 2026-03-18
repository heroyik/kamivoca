"use client";

import { useEffect } from "react";
import { BASE_PATH } from "@/lib/constants";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let isCancelled = false;
    let pollTimer: number | null = null;

    const setOfflineReady = (ready: boolean) => {
      document.documentElement.dataset.offlineReady = ready ? "true" : "false";
    };

    const requestOfflineStatus = async (registration: ServiceWorkerRegistration) => {
      const worker = registration.active ?? navigator.serviceWorker.controller;
      if (!worker) return false;

      return new Promise<boolean>((resolve) => {
        const channel = new MessageChannel();
        const timeout = window.setTimeout(() => resolve(false), 1500);

        channel.port1.onmessage = (event) => {
          window.clearTimeout(timeout);
          resolve(Boolean(event.data?.ready));
        };

        worker.postMessage({ type: "OFFLINE_STATUS" }, [channel.port2]);
      });
    };

    const syncOfflineReady = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const ready = await requestOfflineStatus(registration);
        if (!isCancelled) {
          setOfflineReady(ready);
          if (ready && pollTimer !== null) {
            window.clearInterval(pollTimer);
            pollTimer = null;
          }
        }
        return ready;
      } catch {
        if (!isCancelled) {
          setOfflineReady(false);
        }
        return false;
      }
    };

    const register = async () => {
      setOfflineReady(false);
      try {
        await navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, {
          scope: `${BASE_PATH}/`,
        });

        const ready = await syncOfflineReady();
        if (!ready && !isCancelled) {
          pollTimer = window.setInterval(() => {
            void syncOfflineReady();
          }, 1000);
        }
      } catch (error) {
        console.warn("[SW] registration failed", error);
        setOfflineReady(false);
      }
    };

    void register();

    const handleControllerChange = () => {
      void syncOfflineReady();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      isCancelled = true;
      if (pollTimer !== null) {
        window.clearInterval(pollTimer);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
