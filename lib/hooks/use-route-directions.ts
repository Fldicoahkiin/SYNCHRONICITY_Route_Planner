"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRouteLegKey,
  type PlannedRoute,
  type RouteTravelOverride,
} from "@/lib/utils/route-planner";
import {
  fetchWalkingRoute,
  getVenuePairKey,
} from "@/lib/utils/routing";

const routeCache = new Map<string, RouteTravelOverride>();

export function useRouteDirections(route: PlannedRoute) {
  const [overrides, setOverrides] = useState<Record<string, RouteTravelOverride>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasRouteApiError, setHasRouteApiError] = useState(false);

  const legsToResolve = useMemo(
    () =>
      route.legs.filter(
        (leg) => leg.nextSet && leg.set.venueId && leg.nextSet.venueId,
      ),
    [route.legs],
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (legsToResolve.length === 0) {
        setOverrides({});
        setHasRouteApiError(false);
        return;
      }

      setIsLoading(true);
      const nextOverrides: Record<string, RouteTravelOverride> = {};
      let failed = false;

      await Promise.all(
        legsToResolve.map(async (leg) => {
          const fromVenueId = leg.set.venueId!;
          const toVenueId = leg.nextSet!.venueId!;
          const pairKey = getVenuePairKey(fromVenueId, toVenueId);
          const legKey = getRouteLegKey(leg.set.id, leg.nextSet!.id);

          try {
            const cached = routeCache.get(pairKey);
            const resolved = cached ?? (await fetchWalkingRoute(fromVenueId, toVenueId));
            routeCache.set(pairKey, resolved);
            nextOverrides[legKey] = resolved;
          } catch {
            failed = true;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setOverrides(nextOverrides);
      setHasRouteApiError(failed);
      setIsLoading(false);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [legsToResolve]);

  return {
    overrides,
    isLoading,
    hasRouteApiError,
  };
}
