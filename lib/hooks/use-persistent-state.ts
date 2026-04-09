"use client";

import { useCallback, useEffect, useState } from "react";

type SetStateAction<T> = T | ((prev: T) => T);

const PERSISTENT_STATE_EVENT = "synchronicity:persistent-state";

function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function usePersistentState<T>(key: string, defaultValue: T) {
  const [fallback] = useState(defaultValue);
  const [state, setState] = useState<T>(fallback);

  useEffect(() => {
    setState(readStoredValue(key, fallback));
  }, [key, fallback]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const syncState = () => {
      setState(readStoredValue(key, fallback));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) {
        syncState();
      }
    };

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string }>).detail;
      if (detail?.key === key) {
        syncState();
      }
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
  }, [fallback, key]);

  const setValue = useCallback(
    (value: SetStateAction<T>) => {
      setState((current) => {
        const nextValue =
          typeof value === "function"
            ? (value as (prev: T) => T)(current)
            : value;

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
          window.dispatchEvent(
            new CustomEvent(PERSISTENT_STATE_EVENT, {
              detail: { key },
            }),
          );
        }

        return nextValue;
      });
    },
    [key],
  );

  return [state, setValue] as const;
}
