"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

type SetStateAction<T> = T | ((prev: T) => T);

const PERSISTENT_STATE_EVENT = "synchronicity:persistent-state";

export function usePersistentState<T>(key: string, defaultValue: T) {
  const [fallback] = useState(defaultValue);

  const getSnapshot = useCallback(() => {
    return window.localStorage.getItem(key);
  }, [key]);

  const getServerSnapshot = useCallback(() => {
    return null;
  }, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === key) onStoreChange();
      };

      const handleCustomEvent = (event: Event) => {
        const detail = (event as CustomEvent<{ key: string }>).detail;
        if (detail?.key === key) onStoreChange();
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        PERSISTENT_STATE_EVENT,
        handleCustomEvent as EventListener,
      );

      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(
          PERSISTENT_STATE_EVENT,
          handleCustomEvent as EventListener,
        );
      };
    },
    [key],
  );

  const rawState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const state = useMemo(() => {
    if (rawState === null) {
      return fallback;
    }
    try {
      return JSON.parse(rawState) as T;
    } catch {
      return fallback;
    }
  }, [rawState, fallback]);

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

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(nextValue));
        window.dispatchEvent(
          new CustomEvent(PERSISTENT_STATE_EVENT, {
            detail: { key },
          }),
        );
      }
    },
    [key, fallback],
  );

  return [state, setValue] as const;
}
