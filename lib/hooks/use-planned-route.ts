"use client";

import { useEffect, useMemo } from "react";
import type { TimetableSet } from "@/lib/data/timetable";
import { useConflictSelection } from "@/lib/hooks/use-conflict-selection";
import { useRouteDirections } from "@/lib/hooks/use-route-directions";
import { planRoute } from "@/lib/utils/route-planner";

export function usePlannedRoute(favorites: TimetableSet[], day: 1 | 2) {
  const {
    groupSelections,
    selectedCount,
    toggleOption,
    setGroupSelection,
    selectAllInGroup,
    clearGroup,
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
      ),
    [favorites, day, groupSelections],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    syncWithRoute(baseRoute.conflictGroups);
  }, [
    baseRoute.conflictGroups,
    isHydrated,
    syncWithRoute,
  ]);

  const { overrides, isLoading, hasRouteApiError } = useRouteDirections(baseRoute);

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
    );
  }, [baseRoute, favorites, day, hasOverrides, overrides, groupSelections]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    syncWithRoute(route.conflictGroups);
  }, [route.conflictGroups, isHydrated, syncWithRoute]);

  return {
    route,
    isLoadingDirections: isLoading,
    hasRouteApiError,
    groupSelections,
    selectedCount,
    toggleOption,
    setGroupSelection,
    selectAllInGroup,
    clearGroup,
    syncWithRoute,
    resetDay,
    isHydrated,
  };
}
