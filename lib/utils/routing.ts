import { venueMap } from "@/lib/data/venues";
import type { RouteLeg, RouteTravelOverride } from "@/lib/utils/route-planner";

const ROUTING_TIMEOUT_MS = 8000;

interface WalkingRouteResponse {
  minutes: number;
  distanceMeters: number;
  geometry: [number, number][];
}

export function getVenuePairKey(fromVenueId: string, toVenueId: string): string {
  return `${fromVenueId}->${toVenueId}`;
}

export async function fetchWalkingRoute(
  fromVenueId: string,
  toVenueId: string,
): Promise<RouteTravelOverride> {
  if (fromVenueId === toVenueId) {
    return {
      minutes: 0,
      distanceMeters: 0,
      geometry: [],
      source: "same-venue",
    };
  }

  const fromVenue = venueMap.get(fromVenueId);
  const toVenue = venueMap.get(toVenueId);

  if (!fromVenue || !toVenue) {
    throw new Error("Missing venue coordinates");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);

  try {
    const response = await fetch("/api/walking-route", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromVenueId,
        toVenueId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Routing request failed with ${response.status}`);
    }

    const payload = (await response.json()) as WalkingRouteResponse;

    return {
      minutes: payload.minutes,
      distanceMeters: payload.distanceMeters,
      geometry: payload.geometry,
      source: "route-api",
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getRouteExportStops(legs: RouteLeg[]): Array<{
  lat: number;
  lng: number;
  label: string;
}> {
  const stops: Array<{ lat: number; lng: number; label: string }> = [];

  for (const leg of legs) {
    const venue = leg.set.venueId ? venueMap.get(leg.set.venueId) : null;
    if (!venue) {
      continue;
    }

    const last = stops[stops.length - 1];
    if (!last || last.lat !== venue.lat || last.lng !== venue.lng) {
      stops.push({
        lat: venue.lat,
        lng: venue.lng,
        label: venue.name,
      });
    }
  }

  const finalVenueId = legs[legs.length - 1]?.set.venueId;
  const finalVenue = finalVenueId ? venueMap.get(finalVenueId) : null;
  if (finalVenue) {
    const last = stops[stops.length - 1];
    if (!last || last.lat !== finalVenue.lat || last.lng !== finalVenue.lng) {
      stops.push({
        lat: finalVenue.lat,
        lng: finalVenue.lng,
        label: finalVenue.name,
      });
    }
  }

  return stops;
}
