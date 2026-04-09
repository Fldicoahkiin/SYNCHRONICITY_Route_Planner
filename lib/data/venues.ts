export interface Venue {
  id: string;
  spotId: string;
  name: string;
  nameJa?: string;
  lat: number;
  lng: number;
  area: "A" | "B" | "other";
  color: string;
  thumbnail?: string;
}

export const venues: Venue[] = [
  {
    id: "o-east",
    spotId: "1",
    name: "Spotify O-EAST",
    lat: 35.65879761,
    lng: 139.6955653,
    area: "A",
    color: "#0ea5e9",
  },
  {
    id: "duo",
    spotId: "3",
    name: "duo MUSIC EXCHANGE",
    lat: 35.65864977,
    lng: 139.6955934,
    area: "A",
    color: "#8b5cf6",
  },
  {
    id: "o-west",
    spotId: "4",
    name: "Spotify O-WEST",
    lat: 35.6586091,
    lng: 139.6953293,
    area: "A",
    color: "#10b981",
  },
  {
    id: "clubasia",
    spotId: "5",
    name: "clubasia",
    lat: 35.65894235,
    lng: 139.6953567,
    area: "A",
    color: "#ec4899",
  },
  {
    id: "o-nest",
    spotId: "6",
    name: "Spotify O-nest",
    lat: 35.65852251,
    lng: 139.695366,
    area: "A",
    color: "#f59e0b",
  },
  {
    id: "quattro",
    spotId: "10",
    name: "SHIBUYA CLUB QUATTRO",
    lat: 35.66113162,
    lng: 139.6975436,
    area: "B",
    color: "#ef4444",
  },
  {
    id: "veats",
    spotId: "11",
    name: "Veats Shibuya",
    lat: 35.660678,
    lng: 139.6976543,
    area: "B",
    color: "#06b6d4",
  },
  {
    id: "www",
    spotId: "12",
    name: "WWW",
    lat: 35.66154616,
    lng: 139.6987355,
    area: "B",
    color: "#84cc16",
  },
  {
    id: "wwwx",
    spotId: "13",
    name: "WWWX",
    lat: 35.66153461,
    lng: 139.698536,
    area: "B",
    color: "#d946ef",
  },
  {
    id: "tokio-tokyo",
    spotId: "20",
    name: "TOKIO TOKYO",
    lat: 35.66256358,
    lng: 139.6990026,
    area: "B",
    color: "#f97316",
  },
  {
    id: "fows",
    spotId: "21",
    name: "SHIBUYA FOWS",
    lat: 35.66156503,
    lng: 139.6979548,
    area: "B",
    color: "#a855f7",
  },
  {
    id: "7thfloor",
    spotId: "22",
    name: "7thFLOOR",
    lat: 35.6586091,
    lng: 139.6953293,
    area: "A",
    color: "#14b8a6",
  }
];

export const venueMap = new Map(venues.map((v) => [v.id, v]));
