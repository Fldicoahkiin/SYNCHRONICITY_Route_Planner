interface MapStop {
  lat: number;
  lng: number;
}

function encodeStop(stop: MapStop): string {
  return `${stop.lat},${stop.lng}`;
}

export function buildGoogleMapsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  const origin = encodeStop({ lat: fromLat, lng: fromLng });
  const destination = encodeStop({ lat: toLat, lng: toLng });
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    origin,
  )}&destination=${encodeURIComponent(destination)}&travelmode=walking`;
}

export function buildGoogleMapsRouteUrl(stops: MapStop[]): string {
  if (stops.length < 2) {
    return "https://www.google.com/maps";
  }

  const origin = encodeStop(stops[0]);
  const destination = encodeStop(stops[stops.length - 1]);
  const waypoints = stops
    .slice(1, -1)
    .map(encodeStop)
    .join("|");

  const query = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "walking",
  });

  if (waypoints) {
    query.set("waypoints", waypoints);
  }

  return `https://www.google.com/maps/dir/?${query.toString()}`;
}

export function buildAppleMapsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  return buildAppleMapsRouteUrl([
    { lat: fromLat, lng: fromLng },
    { lat: toLat, lng: toLng },
  ]);
}

export function buildAppleMapsRouteUrl(stops: MapStop[]): string {
  if (stops.length === 0) {
    return "https://maps.apple.com";
  }

  const query = new URLSearchParams({
    destination: encodeStop(stops[stops.length - 1]),
    mode: "walking",
  });

  if (stops.length > 1) {
    query.set("source", encodeStop(stops[0]));
  }

  for (const waypoint of stops.slice(1, -1)) {
    query.append("waypoint", encodeStop(waypoint));
  }

  return `https://maps.apple.com/directions?${query.toString()}`;
}
