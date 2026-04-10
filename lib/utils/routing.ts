import { venueMap } from "@/lib/data/venues";
import type { RouteLeg, RouteTravelOverride } from "@/lib/utils/route-planner";
import routesCacheData from "@/lib/data/routes-cache.json";

const routesCache = routesCacheData as Record<string, { minutes: number; distanceMeters: number; geometry: [number, number][] }>;

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

  const pairKey = getVenuePairKey(fromVenueId, toVenueId);
  const cachedRoute = routesCache[pairKey];
  if (cachedRoute) {
    return {
      minutes: cachedRoute.minutes,
      distanceMeters: cachedRoute.distanceMeters,
      geometry: cachedRoute.geometry,
      source: "local-cache"
    };
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
  venueName: string;
}> {
  const stops: Array<{ lat: number; lng: number; label: string; venueName: string }> = [];

  for (const leg of legs) {
    const venue = leg.set.venueId ? venueMap.get(leg.set.venueId) : null;
    if (!venue) {
      continue;
    }

    const timeLabel = formatTimePair(leg.set.startAt, leg.set.finishAt);
    const annotation = `${leg.set.artistName} ${timeLabel}`;

    const last = stops[stops.length - 1];
    if (last && last.lat === venue.lat && last.lng === venue.lng) {
      // Same venue — append artist info to existing stop label
      last.label = `${last.label} / ${annotation}`;
    } else {
      stops.push({
        lat: venue.lat,
        lng: venue.lng,
        label: `${venue.name}: ${annotation}`,
        venueName: venue.name,
      });
    }
  }

  return stops;
}

/** Compact HH:MM-HH:MM for export labels */
function formatTimePair(startAt: number, finishAt: number): string {
  const fmt = (ts: number) => {
    const d = new Date(ts * 1000);
    const h = d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", hour12: false });
    const m = d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", minute: "2-digit" });
    return `${h}:${m.padStart(2, "0")}`;
  };
  return `${fmt(startAt)}-${fmt(finishAt)}`;
}
