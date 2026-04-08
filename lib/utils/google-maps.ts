/**
 * Google Maps API utilities for route planning and directions
 * Uses Google Maps Embed API and Directions API URLs
 */

export interface GoogleMapsConfig {
  apiKey?: string; // Optional - for directions queries
}

/**
 * Build Google Maps Embed URL for displaying a venue
 */
export function buildGoogleMapsEmbedUrl(
  lat: number,
  lng: number,
  title?: string
): string {
  const center = `${lat},${lng}`;
  const zoom = 16;
  const mapType = "roadmap";
  
  // Embed API URL - no API key required for basic embed
  return `https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}&q=${encodeURIComponent(title || `${lat},${lng}`)}&zoom=${zoom}`;
}

/**
 * Build Google Maps Directions URL for desktop/mobile
 */
export function buildGoogleMapsDirectionsUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  originName?: string,
  destName?: string
): string {
  const origin = originName ? encodeURIComponent(originName) : `${originLat},${originLng}`;
  const destination = destName ? encodeURIComponent(destName) : `${destLat},${destLng}`;
  
  return `https://www.google.com/maps/dir/${origin}/${destination}?travelmode=walking`;
}

/**
 * Fetch walking time from Google Maps Directions API
 * Note: Requires backend proxy or API key with CORS
 */
export async function getGoogleMapsWalkingTime(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  apiKey?: string
): Promise<{
  durationSeconds: number;
  distanceMeters: number;
  polylinePoints: Array<[number, number]>;
} | null> {
  if (!apiKey) {
    console.warn("Google Maps API key not provided - cannot fetch walking time");
    return null;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${originLat},${originLng}`);
    url.searchParams.set("destination", `${destLat},${destLng}`);
    url.searchParams.set("mode", "walking");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error("Google Maps API error:", response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.status !== "OK" || !data.routes?.[0]) {
      console.error("No route found:", data.status);
      return null;
    }

    const leg = data.routes[0].legs[0];
    const points = decodePolyline(data.routes[0].overview_polyline.points);

    return {
      durationSeconds: leg.duration.value,
      distanceMeters: leg.distance.value,
      polylinePoints: points,
    };
  } catch (error) {
    console.error("Error fetching Google Maps walking time:", error);
    return null;
  }
}

/**
 * Decode Google Maps polyline encoding
 * @param encoded - Encoded polyline string
 * @returns Array of [lat, lng] coordinates
 */
export function decodePolyline(encoded: string): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

/**
 * Build URL to open Google Maps app or web
 */
export function buildGoogleMapsAppUrl(
  lat: number,
  lng: number,
  title?: string
): string {
  const label = title ? `${encodeURIComponent(title)}@` : "";
  return `https://maps.google.com/?q=${label}${lat},${lng}`;
}
