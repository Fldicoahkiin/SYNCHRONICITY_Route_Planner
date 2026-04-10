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
  venueId?: string;
}

function encodeStopForGoogleRouting(stop: MapStopWithLabel): string {
  if (stop.venueName) {
    // Strip parenthetical alternative names for better generic POI resolution
    const cleanName = stop.venueName.replace(/\s*\(.*?\)\s*/g, '');
    return `${cleanName}, Shibuya, Tokyo`;
  }
  return encodeStop(stop);
}

function encodeStopForAppleRouting(stop: MapStopWithLabel): string {
  if (stop.venueId) {
    // Use proven searchable names or fallback to exact coordinates for Apple Maps 
    // because Apple Maps text search is significantly less adaptable than Google Maps.
    const appleSafeNames: Record<string, string> = {
      "o-east": "Spotify O-EAST, Shibuya, Tokyo",
      "o-west": "Spotify O-WEST, Shibuya, Tokyo",
      "clubasia": "clubasia, Shibuya, Tokyo",
      "duo": "duo MUSIC EXCHANGE, Shibuya, Tokyo",
      "o-nest": "Spotify O-nest, Shibuya, Tokyo",
      // Apple maps might misread these or they are too obscure: map to coordinates directly
      "www": encodeStop(stop), // WWW and WWW X share the same building but maps confuse them
      "wwwx": encodeStop(stop),
      "tokio-tokyo": encodeStop(stop),
      "fows": encodeStop(stop),
      "7thfloor": encodeStop(stop),
      "linecube": "LINE CUBE SHIBUYA, Shibuya, Tokyo",
    };
    
    // For nested venues (e.g., 2nd stages), use coordinates because 
    // Apple Maps will fail to find sub-venues accurately via string search.
    if (stop.venueId.includes("2nd") || stop.venueId.includes("3f") || stop.venueId.includes("lobby")) {
      return encodeStop(stop);
    }
    
    if (appleSafeNames[stop.venueId]) {
      return appleSafeNames[stop.venueId];
    }
  }
  return encodeStop(stop);
}

export function buildGoogleMapsRouteUrl(stops: MapStopWithLabel[]): string {
  if (stops.length < 2) {
    return "https://www.google.com/maps";
  }

  // Google Maps URL scheme supports a maximum of 9 waypoints plus origin and destination.
  const routeStops = stops.length > 11 ? [stops[0], ...stops.slice(1, 10), stops[stops.length - 1]] : stops;

  const origin = encodeStopForGoogleRouting(routeStops[0]);
  const destination = encodeStopForGoogleRouting(routeStops[routeStops.length - 1]);
  const waypoints = routeStops
    .slice(1, -1)
    .map(encodeStopForGoogleRouting)
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
  const origin = encodeURIComponent(encodeStopForAppleRouting(stops[0]));
  const destination = encodeURIComponent(encodeStopForAppleRouting(stops[stops.length - 1]));
  
  return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=w`;
}
