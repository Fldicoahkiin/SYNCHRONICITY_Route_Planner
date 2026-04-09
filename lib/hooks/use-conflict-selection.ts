"use client";

import type { ConflictGroup } from "@/lib/utils/route-planner";
import { useCallback, useMemo, useSyncExternalStore } from "react";

interface StoredConflictSelectionState {
  groupSelections: Record<string, string[]>;
}

const EMPTY_STATE: StoredConflictSelectionState = {
  groupSelections: {},
};

const STORAGE_EVENT = "synchronicity:conflict-selection-changed";
const storageSnapshotCache = new Map<
  string,
  { raw: string | null; state: StoredConflictSelectionState }
>();

export function useConflictSelection(day: 1 | 2) {
  const storageKey = `synchronicity-conflict-state-day${day}`;
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        onStoreChange();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORAGE_EVENT, onStoreChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORAGE_EVENT, onStoreChange);
    };
  }, [storageKey]);

  const state = useSyncExternalStore(
    subscribe,
    () => readStoredConflictSelection(storageKey, day),
    () => EMPTY_STATE,
  );

  const updateState = useCallback((updater: (current: StoredConflictSelectionState) => StoredConflictSelectionState) => {
    if (typeof window === "undefined") {
      return;
    }

    const nextState = updater(readStoredConflictSelection(storageKey, day));
    writeStoredConflictSelection(storageKey, nextState);
  }, [day, storageKey]);

  const syncWithRoute = useCallback(
    (groups: ConflictGroup[]) => {
      updateState((prev) => {
        const nextGroupSelections: Record<string, string[]> = {};

        for (const group of groups) {
          const allowed = new Set(group.performanceIds);
          const previousSelection = prev.groupSelections[group.id] ?? group.performanceIds;
          const normalizedSelection = group.performances
            .map((performance) => performance.id)
            .filter((performanceId) => previousSelection.includes(performanceId))
            .filter((performanceId) => allowed.has(performanceId));

          nextGroupSelections[group.id] = normalizedSelection;
        }

        const nextState: StoredConflictSelectionState = {
          groupSelections: nextGroupSelections,
        };

        return shallowEqualState(prev, nextState) ? prev : nextState;
      });
    },
    [updateState],
  );

  const toggleOption = useCallback((groupId: string, performanceId: string) => {
    updateState((prev) => {
      const currentSelection = prev.groupSelections[groupId] ?? [];
      const exists = currentSelection.includes(performanceId);
      const nextSelection = exists
        ? currentSelection.filter((id) => id !== performanceId)
        : [...currentSelection, performanceId];

      return {
        ...prev,
        groupSelections: {
          ...prev.groupSelections,
          [groupId]: nextSelection,
        },
      };
    });
  }, [updateState]);

  const setGroupSelection = useCallback((groupId: string, performanceIds: string[]) => {
    updateState((prev) => ({
      ...prev,
      groupSelections: {
        ...prev.groupSelections,
        [groupId]: Array.from(new Set(performanceIds)),
      },
    }));
  }, [updateState]);

  const selectAllInGroup = useCallback((groupId: string, performanceIds: string[]) => {
    setGroupSelection(groupId, performanceIds);
  }, [setGroupSelection]);

  const clearGroup = useCallback((groupId: string) => {
    setGroupSelection(groupId, []);
  }, [setGroupSelection]);

  const resetDay = useCallback(() => {
    writeStoredConflictSelection(storageKey, EMPTY_STATE);
  }, [storageKey]);

  const selectedCount = useMemo(
    () => Object.values(state.groupSelections).reduce((count, ids) => count + ids.length, 0),
    [state.groupSelections],
  );

  return {
    groupSelections: state.groupSelections,
    selectedCount,
    toggleOption,
    setGroupSelection,
    selectAllInGroup,
    clearGroup,
    syncWithRoute,
    resetDay,
    isHydrated: typeof window !== "undefined",
  };
}

function readStoredConflictSelection(
  storageKey: string,
  day: 1 | 2,
): StoredConflictSelectionState {
  if (typeof window === "undefined") {
    return EMPTY_STATE;
  }

  const stored = window.localStorage.getItem(storageKey);

  if (!stored) {
    storageSnapshotCache.set(storageKey, { raw: null, state: EMPTY_STATE });
    return EMPTY_STATE;
  }

  const cachedSnapshot = storageSnapshotCache.get(storageKey);
  if (cachedSnapshot?.raw === stored) {
    return cachedSnapshot.state;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<StoredConflictSelectionState>;
    const nextState = {
      groupSelections: normalizeGroupSelections(parsed.groupSelections),
    };
    storageSnapshotCache.set(storageKey, { raw: stored, state: nextState });
    return nextState;
  } catch (error) {
    console.warn(`Failed to parse conflict selections for day ${day}:`, error);
    storageSnapshotCache.set(storageKey, { raw: stored, state: EMPTY_STATE });
    return EMPTY_STATE;
  }
}

function writeStoredConflictSelection(
  storageKey: string,
  state: StoredConflictSelectionState,
) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(state);
  storageSnapshotCache.set(storageKey, { raw: serialized, state });
  window.localStorage.setItem(storageKey, serialized);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function normalizeGroupSelections(input: StoredConflictSelectionState["groupSelections"] | undefined) {
  if (!input || typeof input !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(input).map(([groupId, ids]) => [
      groupId,
      Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [],
    ]),
  );
}

function shallowEqualState(
  left: StoredConflictSelectionState,
  right: StoredConflictSelectionState,
) {
  const leftKeys = Object.keys(left.groupSelections);
  const rightKeys = Object.keys(right.groupSelections);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    const leftIds = left.groupSelections[key] ?? [];
    const rightIds = right.groupSelections[key] ?? [];

    if (leftIds.length !== rightIds.length) {
      return false;
    }

    return leftIds.every((value, index) => value === rightIds[index]);
  });
}
