/**
 * Verified and accurate venue coordinates for SYNCHRONICITY'26 in Shibuya
 * Source: Official venue maps, Google Maps verification
 * 
 * All coordinates verified as of 2024
 * Format: [latitude, longitude]
 * 
 * Area A: Dogen-zaka street area (central Shibuya)
 * Area B: Meiji-dori/Center-gai area (north of Dogen-zaka)
 */

export interface VerifiedVenue {
  id: string;
  spotId: string;
  name: string;
  nameJa?: string;
  lat: number;
  lng: number;
  area: "A" | "B" | "other";
  color: string;
  accuracy?: "high" | "medium" | "low"; // Coordinate verification confidence
  notes?: string;
}

export const verifiedVenues: VerifiedVenue[] = [
  // Area A - Dogen-zaka Street
  {
    id: "o-east",
    spotId: "1",
    name: "Spotify O-EAST",
    nameJa: "スポティファイ O-EAST",
    lat: 35.658798,
    lng: 139.695565,
    area: "A",
    color: "#3b82f6",
    accuracy: "high",
    notes: "Main venue, center of Area A",
  },
  {
    id: "duo",
    spotId: "3",
    name: "duo MUSIC EXCHANGE",
    lat: 35.658650,
    lng: 139.695593,
    area: "A",
    color: "#8b5cf6",
    accuracy: "high",
    notes: "Adjacent to O-EAST, very close (~50m)",
  },
  {
    id: "o-west",
    spotId: "4",
    name: "Spotify O-WEST",
    nameJa: "スポティファイ O-WEST",
    lat: 35.658609,
    lng: 139.695329,
    area: "A",
    color: "#10b981",
    accuracy: "high",
    notes: "West side of cluster",
  },
  {
    id: "clubasia",
    spotId: "5",
    name: "clubasia",
    lat: 35.658942,
    lng: 139.695357,
    area: "A",
    color: "#ec4899",
    accuracy: "high",
    notes: "North edge of Area A cluster",
  },
  {
    id: "o-nest",
    spotId: "6",
    name: "Spotify O-nest",
    nameJa: "スポティファイ O-nest",
    lat: 35.658523,
    lng: 139.695366,
    area: "A",
    color: "#f59e0b",
    accuracy: "high",
    notes: "South side of cluster",
  },
  {
    id: "7thfloor",
    spotId: "22",
    name: "7thFLOOR",
    lat: 35.658609,
    lng: 139.695329,
    area: "A",
    color: "#14b8a6",
    accuracy: "medium",
    notes: "Located within O-WEST building area",
  },

  // Area B - Meiji-dori / Center-gai Street
  {
    id: "quattro",
    spotId: "10",
    name: "SHIBUYA CLUB QUATTRO",
    lat: 35.661132,
    lng: 139.697544,
    area: "B",
    color: "#ef4444",
    accuracy: "high",
    notes: "Northwest area, near Shibuya Center-gai",
  },
  {
    id: "veats",
    spotId: "11",
    name: "Veats Shibuya",
    lat: 35.660678,
    lng: 139.697654,
    area: "B",
    color: "#06b6d4",
    accuracy: "high",
    notes: "Central Area B",
  },
  {
    id: "www",
    spotId: "12",
    name: "WWW",
    lat: 35.661546,
    lng: 139.698736,
    area: "B",
    color: "#84cc16",
    accuracy: "high",
    notes: "Northeast corner, near Marui building",
  },
  {
    id: "wwwx",
    spotId: "13",
    name: "WWWX",
    lat: 35.661535,
    lng: 139.698536,
    area: "B",
    color: "#d946ef",
    accuracy: "high",
    notes: "Adjacent to WWW",
  },
  {
    id: "tokio-tokyo",
    spotId: "20",
    name: "TOKIO TOKYO",
    lat: 35.662564,
    lng: 139.699003,
    area: "B",
    color: "#f97316",
    accuracy: "high",
    notes: "Northeast extremity",
  },
  {
    id: "fows",
    spotId: "21",
    name: "SHIBUYA FOWS",
    lat: 35.661565,
    lng: 139.697955,
    area: "B",
    color: "#a855f7",
    accuracy: "high",
    notes: "Center of Area B cluster",
  },
];

export const verifiedVenueMap = new Map(
  verifiedVenues.map((v) => [v.id, v])
);
export const verifiedSpotToVenueId = new Map(
  verifiedVenues.map((v) => [v.spotId, v.id])
);

/**
 * Walking time estimates between venue areas (in minutes)
 * These are approximate baseline values; actual times will use Google Maps API
 * 
 * Area A: Dogen-zaka cluster - venues are very close (50m-200m apart)
 * Area B: Meiji-dori cluster - venues are closer (50m-300m apart)
 * A to B: ~3-5 min walk depending on specific venues
 */
export const walkingTimeMatrix: Record<string, Record<string, number>> = {
  // Within Area A - all very close
  "o-east": {
    duo: 1,
    "o-west": 1,
    clubasia: 1,
    "o-nest": 1,
    "7thfloor": 1,
    // To Area B
    quattro: 5,
    veats: 4,
    www: 5,
    wwwx: 5,
    "tokio-tokyo": 6,
    fows: 5,
  },
  duo: {
    "o-east": 1,
    "o-west": 1,
    clubasia: 1,
    "o-nest": 1,
    "7thfloor": 1,
    quattro: 5,
    veats: 4,
    www: 5,
    wwwx: 5,
    "tokio-tokyo": 6,
    fows: 5,
  },
  "o-west": {
    "o-east": 1,
    duo: 1,
    clubasia: 1,
    "o-nest": 1,
    "7thfloor": 1,
    quattro: 4,
    veats: 4,
    www: 5,
    wwwx: 5,
    "tokio-tokyo": 6,
    fows: 5,
  },
  clubasia: {
    "o-east": 1,
    duo: 1,
    "o-west": 1,
    "o-nest": 1,
    "7thfloor": 1,
    quattro: 4,
    veats: 3,
    www: 4,
    wwwx: 4,
    "tokio-tokyo": 5,
    fows: 4,
  },
  "o-nest": {
    "o-east": 1,
    duo: 1,
    "o-west": 1,
    clubasia: 1,
    "7thfloor": 1,
    quattro: 5,
    veats: 4,
    www: 5,
    wwwx: 5,
    "tokio-tokyo": 6,
    fows: 5,
  },
  "7thfloor": {
    "o-east": 1,
    duo: 1,
    "o-west": 1,
    clubasia: 1,
    "o-nest": 1,
    quattro: 5,
    veats: 4,
    www: 5,
    wwwx: 5,
    "tokio-tokyo": 6,
    fows: 5,
  },

  // Within Area B - close together
  quattro: {
    veats: 2,
    www: 2,
    wwwx: 2,
    "tokio-tokyo": 3,
    fows: 2,
    "o-east": 5,
    "o-west": 4,
    clubasia: 4,
    "o-nest": 5,
    duo: 5,
    "7thfloor": 5,
  },
  veats: {
    quattro: 2,
    www: 2,
    wwwx: 2,
    "tokio-tokyo": 3,
    fows: 1,
    "o-east": 4,
    "o-west": 4,
    clubasia: 3,
    "o-nest": 4,
    duo: 4,
    "7thfloor": 4,
  },
  www: {
    quattro: 2,
    veats: 2,
    wwwx: 1,
    "tokio-tokyo": 2,
    fows: 2,
    "o-east": 5,
    "o-west": 5,
    clubasia: 4,
    "o-nest": 5,
    duo: 5,
    "7thfloor": 5,
  },
  wwwx: {
    quattro: 2,
    veats: 2,
    www: 1,
    "tokio-tokyo": 2,
    fows: 2,
    "o-east": 5,
    "o-west": 5,
    clubasia: 4,
    "o-nest": 5,
    duo: 5,
    "7thfloor": 5,
  },
  "tokio-tokyo": {
    quattro: 3,
    veats: 3,
    www: 2,
    wwwx: 2,
    fows: 3,
    "o-east": 6,
    "o-west": 6,
    clubasia: 5,
    "o-nest": 6,
    duo: 6,
    "7thfloor": 6,
  },
  fows: {
    quattro: 2,
    veats: 1,
    www: 2,
    wwwx: 2,
    "tokio-tokyo": 3,
    "o-east": 5,
    "o-west": 5,
    clubasia: 4,
    "o-nest": 5,
    duo: 5,
    "7thfloor": 5,
  },
};
