"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

type SetStateAction<T> = T | ((prev: T) => T);

const PERSISTENT_STATE_EVENT = "synchronicity:persistent-state";

// ---------- hydration-safe external store ----------
// On server: version stays 0, getSnapshot returns "0:" → fallback.
// On client: a microtask bumps version to 1 before the first paint,
// causing useSyncExternalStore subscriptions to re-fire and read localStorage.
let version = 0;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  queueMicrotask(() => {
    version = 1;
    for (const fn of listeners) fn();
  });
}

function subscribeGlobal(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => { listeners.delete(onStoreChange); };
}

export function usePersistentState<T>(key: string, defaultValue: T) {
  const [fallback] = useState(defaultValue);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }

      const handleStorage = (event: StorageEvent) => {
        if (event.key === key) onStoreChange();
      };

      const handleCustomEvent = (event: Event) => {
        const detail = (event as CustomEvent<{ key: string }>).detail;
        if (detail?.key === key) onStoreChange();
      };

      const unsubGlobal = subscribeGlobal(onStoreChange);

      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        PERSISTENT_STATE_EVENT,
        handleCustomEvent as EventListener,
      );

      return () => {
        unsubGlobal();
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(
          PERSISTENT_STATE_EVENT,
          handleCustomEvent as EventListener,
        );
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => {
    if (version === 0) {
      return "0:";
    }
    const raw = window.localStorage.getItem(key);
    return `${version}:${raw ?? ""}`;
  }, [key]);

  const getServerSnapshot = useCallback(() => "0:", []);

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const state = useMemo(() => {
    const colonIndex = snapshot.indexOf(":");
    const raw = snapshot.slice(colonIndex + 1);
    if (raw === "") {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [snapshot, fallback]);

  const setValue = useCallback(
    (value: SetStateAction<T>) => {
      const currentRaw = window.localStorage.getItem(key);
      let currentState: T = fallback;
      if (currentRaw !== null) {
        try {
          currentState = JSON.parse(currentRaw) as T;
        } catch {}
      }

      const nextValue =
        typeof value === "function"
          ? (value as (prev: T) => T)(currentState)
          : value;

      window.localStorage.setItem(key, JSON.stringify(nextValue));

      version += 1;

      window.dispatchEvent(
        new CustomEvent(PERSISTENT_STATE_EVENT, {
          detail: { key },
        }),
      );
    },
    [key, fallback],
  );

  return [state, setValue] as const;
}
