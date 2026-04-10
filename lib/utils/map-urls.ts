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
  venueName?: string;
}

function encodeStopForRouting(stop: MapStopWithLabel): string {
  if (stop.venueName) {
    return `${stop.venueName}, Shibuya, Tokyo`;
  }
  return encodeStop(stop);
}

export function buildGoogleMapsRouteUrl(stops: MapStopWithLabel[]): string {
  if (stops.length < 2) {
    return "https://www.google.com/maps";
  }

  // Google Maps URL scheme supports a maximum of 9 waypoints plus origin and destination.
  const routeStops = stops.length > 11 ? [stops[0], ...stops.slice(1, 10), stops[stops.length - 1]] : stops;

  const origin = encodeStopForRouting(routeStops[0]);
  const destination = encodeStopForRouting(routeStops[routeStops.length - 1]);
  const waypoints = routeStops
    .slice(1, -1)
    .map(encodeStopForRouting)
    .map(encodeURIComponent)
    .join("|");

  const query = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "walking",
  });

  // The URLSearchParams already URL-encodes, so waypoints joined with | 
  // will have the | encoded to %7C if passed via set(), which is fine for Google Maps.
  // Wait! URLSearchParams encodes the `|`. Let's just append the string manually or use it as is.
  let url = `https://www.google.com/maps/dir/?${query.toString()}`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }
  return url;
}

export function buildAppleMapsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  return `https://maps.apple.com/?saddr=${fromLat},${fromLng}&daddr=${toLat},${toLng}&dirflg=w`;
}

export function buildAppleMapsRouteUrl(stops: MapStopWithLabel[]): string {
  if (stops.length < 2) {
    return "https://maps.apple.com";
  }
  // Apple Maps URL scheme does NOT support multi-stop waypoints well via saddr/daddr.
  // We can only provide the start and the ultimate destination.
  const origin = encodeURIComponent(encodeStopForRouting(stops[0]));
  const destination = encodeURIComponent(encodeStopForRouting(stops[stops.length - 1]));
  
  return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=w`;
}
