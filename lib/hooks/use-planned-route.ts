"use client";

import { useMemo } from "react";
import type { TimetableSet } from "@/lib/data/timetable";
import { useRouteDirections } from "@/lib/hooks/use-route-directions";
import { planRoute } from "@/lib/utils/route-planner";

export function usePlannedRoute(favorites: TimetableSet[], day: 1 | 2) {
  const baseRoute = useMemo(
    () =>
      planRoute(
        favorites,
        day,
        {},
        // Pass empty object for groupSelections, conflict groups will be generated but not auto-filtered
        {},
      ),
    [favorites, day],
  );

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
      {},
    );
  }, [baseRoute, favorites, day, hasOverrides, overrides]);

  return {
    route,
    isLoadingDirections: isLoading,
    hasRouteApiError,
    isHydrated: typeof window !== "undefined",
  };
}
