import { venueMap } from "@/lib/data/venues";
import { NextRequest, NextResponse } from "next/server";
import routesCacheData from "@/lib/data/routes-cache.json";

const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions/foot-walking";
const ROUTING_TIMEOUT_MS = 8000;

interface OrsRouteResponse {
  routes?: Array<{
    summary: {
      distance: number;
      duration: number;
    };
    geometry: {
      type: "LineString";
      coordinates: [number, number][];
    };
  }>;
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function getFallbackRoute(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const straightDistance = calculateHaversineDistance(fromLat, fromLng, toLat, toLng);
  // Multiply by 1.3 to approximate street network (Manhattan-ish distance)
  const estimatedDistance = Math.round(straightDistance * 1.3);
  // Average walking speed ~80 meters per minute (4.8 km/h)
  const estimatedMinutes = Math.max(1, Math.round(estimatedDistance / 80));

  return NextResponse.json({
    minutes: estimatedMinutes,
    distanceMeters: estimatedDistance,
    geometry: [
      [fromLat, fromLng],
      [toLat, toLng],
    ] as [number, number][],
    _fallback: true,
  });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ORS_API_KEY;

  try {
    const body = (await request.json()) as {
      fromVenueId: string;
      toVenueId: string;
    };

    const { fromVenueId, toVenueId } = body;

    if (fromVenueId === toVenueId) {
      return NextResponse.json({
        minutes: 0,
        distanceMeters: 0,
        geometry: [] as [number, number][],
      });
    }

    const fromVenue = venueMap.get(fromVenueId);
    const toVenue = venueMap.get(toVenueId);

    if (!fromVenue || !toVenue) {
      return NextResponse.json(
        { error: "Missing venue coordinates" },
        { status: 400 },
      );
    }

    const pairKey = `${fromVenueId}->${toVenueId}`;
    const cached = (routesCacheData as any)[pairKey];
    if (cached && cached.geometry && cached.geometry.length > 0) {
      return NextResponse.json({
        minutes: cached.minutes,
        distanceMeters: cached.distanceMeters,
        geometry: cached.geometry,
      });
    }

    if (!apiKey) {
      // Graceful degradation when key is missing (Local Dev without API keys)
      return getFallbackRoute(fromVenue.lat, fromVenue.lng, toVenue.lat, toVenue.lng);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);

    try {
      const response = await fetch(ORS_BASE_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify({
          coordinates: [
            [fromVenue.lng, fromVenue.lat],
            [toVenue.lng, toVenue.lat],
          ],
          format: "geojson",
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Fallback for API failure (e.g. rate limit, 502) instead of fully crashing the frontend.
        return getFallbackRoute(fromVenue.lat, fromVenue.lng, toVenue.lat, toVenue.lng);
      }

      const payload = (await response.json()) as OrsRouteResponse;
      const route = payload.routes?.[0];

      if (!route) {
         return getFallbackRoute(fromVenue.lat, fromVenue.lng, toVenue.lat, toVenue.lng);
      }

      const coordinates: [number, number][] =
        route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

      return NextResponse.json({
        minutes: Math.max(1, Math.round(route.summary.duration / 60)),
        distanceMeters: Math.round(route.summary.distance),
        geometry: coordinates,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 },
    );
  }
}
