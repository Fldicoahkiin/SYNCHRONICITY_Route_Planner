"use client";

import { useEffect, useMemo } from "react";
import type { TimetableSet } from "@/lib/data/timetable";
import { useConflictSelection } from "@/lib/hooks/use-conflict-selection";
import { useRouteDirections } from "@/lib/hooks/use-route-directions";
import { planRoute } from "@/lib/utils/route-planner";

export function usePlannedRoute(favorites: TimetableSet[], day: 1 | 2) {
  const conflictState = useConflictSelection(day);

  const baseRoute = useMemo(
    () =>
      planRoute(
        favorites,
        day,
        {},
        conflictState.groupSelections,
        conflictState.focusedBranchId,
      ),
    [favorites, day, conflictState.groupSelections, conflictState.focusedBranchId],
  );

  useEffect(() => {
    if (!conflictState.isHydrated) {
      return;
    }

    conflictState.syncWithRoute(baseRoute.conflictGroups, baseRoute.focusedBranchId || null);
  }, [
    baseRoute.conflictGroups,
    baseRoute.focusedBranchId,
    conflictState,
  ]);

  const { overrides, isLoading, hasRouteApiError } = useRouteDirections(baseRoute.focusedBranch);

  const route = useMemo(
    () =>
      planRoute(
        favorites,
        day,
        overrides,
        conflictState.groupSelections,
        conflictState.focusedBranchId,
      ),
    [favorites, day, overrides, conflictState.groupSelections, conflictState.focusedBranchId],
  );

  useEffect(() => {
    if (!conflictState.isHydrated) {
      return;
    }

    conflictState.syncWithRoute(route.conflictGroups, route.focusedBranchId || null);
  }, [route.conflictGroups, route.focusedBranchId, conflictState]);

  return {
    route,
    isLoadingDirections: isLoading,
    hasRouteApiError,
    ...conflictState,
  };
}
