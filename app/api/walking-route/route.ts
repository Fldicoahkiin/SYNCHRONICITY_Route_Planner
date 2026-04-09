import { venueMap } from "@/lib/data/venues";
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ORS_API_KEY is not configured" },
      { status: 500 },
    );
  }

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
        const text = await response.text().catch(() => "");
        return NextResponse.json(
          { error: `Routing API error: ${response.status}`, detail: text },
          { status: 502 },
        );
      }

      const payload = (await response.json()) as OrsRouteResponse;
      const route = payload.routes?.[0];

      if (!route) {
        return NextResponse.json(
          { error: "Routing API returned no route" },
          { status: 502 },
        );
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
