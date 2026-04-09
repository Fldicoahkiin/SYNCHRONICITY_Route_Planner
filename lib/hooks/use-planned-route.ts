"use client";

import { useEffect, useMemo } from "react";
import type { TimetableSet } from "@/lib/data/timetable";
import { useConflictSelection } from "@/lib/hooks/use-conflict-selection";
import { useRouteDirections } from "@/lib/hooks/use-route-directions";
import { planRoute } from "@/lib/utils/route-planner";

export function usePlannedRoute(favorites: TimetableSet[], day: 1 | 2) {
  const {
    groupSelections,
    focusedBranchId,
    selectedCount,
    toggleOption,
    setGroupSelection,
    selectAllInGroup,
    clearGroup,
    setFocusedBranch,
    syncWithRoute,
    resetDay,
    isHydrated,
  } = useConflictSelection(day);

  const baseRoute = useMemo(
    () =>
      planRoute(
        favorites,
        day,
        {},
        groupSelections,
        focusedBranchId,
      ),
    [favorites, day, groupSelections, focusedBranchId],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    syncWithRoute(baseRoute.conflictGroups, baseRoute.focusedBranchId || null);
  }, [
    baseRoute.conflictGroups,
    baseRoute.focusedBranchId,
    isHydrated,
    syncWithRoute,
  ]);

  const { overrides, isLoading, hasRouteApiError } = useRouteDirections(baseRoute.focusedBranch);

  const hasOverrides = Object.keys(overrides).length > 0;

  const route = useMemo(() => {
    if (!hasOverrides) {
      return baseRoute;
    }
    return planRoute(
      favorites,
      day,
      overrides,
      groupSelections,
      focusedBranchId,
    );
  }, [baseRoute, favorites, day, hasOverrides, overrides, groupSelections, focusedBranchId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    syncWithRoute(route.conflictGroups, route.focusedBranchId || null);
  }, [route.conflictGroups, route.focusedBranchId, isHydrated, syncWithRoute]);

  return {
    route,
    isLoadingDirections: isLoading,
    hasRouteApiError,
    groupSelections,
    focusedBranchId,
    selectedCount,
    toggleOption,
    setGroupSelection,
    selectAllInGroup,
    clearGroup,
    setFocusedBranch,
    syncWithRoute,
    resetDay,
    isHydrated,
  };
}
