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

interface MapStopWithLabel extends MapStop {
  label?: string;
}

function encodeStopLabel(stop: MapStopWithLabel): string {
  // Google Maps can resolve labeled waypoints when they include coordinates
  if (stop.label) {
    return `${stop.lat},${stop.lng}`;
  }
  return encodeStop(stop);
}

export function buildGoogleMapsRouteUrl(stops: MapStopWithLabel[]): string {
  if (stops.length < 2) {
    return "https://www.google.com/maps";
  }

  // Google Maps URL scheme supports a maximum of 9 waypoints plus origin and destination.
  const routeStops = stops.length > 11 ? [stops[0], ...stops.slice(1, 10), stops[stops.length - 1]] : stops;

  const origin = encodeStopLabel(routeStops[0]);
  const destination = encodeStopLabel(routeStops[routeStops.length - 1]);
  const waypoints = routeStops
    .slice(1, -1)
    .map(encodeStopLabel)
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
  return `https://maps.apple.com/?saddr=${fromLat},${fromLng}&daddr=${toLat},${toLng}&dirflg=w`;
}

export function buildAppleMapsRouteUrl(stops: MapStop[]): string {
  if (stops.length < 2) {
    return "https://maps.apple.com";
  }
  // Apple Maps URL scheme does NOT support multi-stop waypoints.
  // We can only provide the start and the ultimate destination.
  const origin = encodeStop(stops[0]);
  const destination = encodeStop(stops[stops.length - 1]);
  
  return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=w`;
}
