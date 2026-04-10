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

function getSafeRoutingLocation(stop: MapStopWithLabel): string {
  if (stop.venueId) {
    // Both Google and Apple Maps can get horribly confused by certain venue names
    // so we maintain a strict whitelist of safe search queries vs coordinate fallbacks.
    const safeNames: Record<string, string> = {
      "o-east": "Spotify O-EAST, Shibuya, Tokyo",
      "o-west": "Spotify O-WEST, Shibuya, Tokyo",
      "clubasia": "clubasia, Shibuya, Tokyo",
      "duo": "duo MUSIC EXCHANGE, Shibuya, Tokyo",
      "o-nest": "Spotify O-nest, Shibuya, Tokyo",
      "linecube": "LINE CUBE SHIBUYA, Shibuya, Tokyo",
      "quattro": "SHIBUYA CLUB QUATTRO, Shibuya, Tokyo",
      "veats": "Veats Shibuya, Tokyo",
    };
    
    // For nested venues or confusing names (WWW, WWW X, Tokio Tokyo, 2nd stages),
    // use exact coordinates because maps will fail to find sub-venues safely.
    if (
      stop.venueId.includes("2nd") || 
      stop.venueId.includes("3f") || 
      stop.venueId.includes("lobby") ||
      ["www", "wwwx", "tokio-tokyo", "7thfloor", "fows"].includes(stop.venueId)
    ) {
      return encodeStop(stop);
    }
    
    if (safeNames[stop.venueId]) {
      return safeNames[stop.venueId];
    }
  }

  // Fallback to coordinates entirely if name isn't explicitly safe
  if (stop.venueName) {
     const cleanName = stop.venueName.replace(/\s*\(.*?\)\s*/g, '');
     return `${cleanName}, Shibuya, Tokyo`;
  }
  
  return encodeStop(stop);
}

function encodeStopForGoogleRouting(stop: MapStopWithLabel): string {
  return getSafeRoutingLocation(stop);
}

function encodeStopForAppleRouting(stop: MapStopWithLabel): string {
  return getSafeRoutingLocation(stop);
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
