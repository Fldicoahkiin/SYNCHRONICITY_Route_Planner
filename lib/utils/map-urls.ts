export function buildGoogleMapsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  const origin = `${fromLat},${fromLng}`;
  const destination = `${toLat},${toLng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    origin,
  )}&destination=${encodeURIComponent(destination)}&travelmode=walking`;
}

export function buildAppleMapsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): string {
  const saddr = `${fromLat},${fromLng}`;
  const daddr = `${toLat},${toLng}`;
  return `http://maps.apple.com/?saddr=${encodeURIComponent(
    saddr,
  )}&daddr=${encodeURIComponent(daddr)}&dirflg=w`;
}
