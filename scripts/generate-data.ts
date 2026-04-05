import * as fs from "fs";
import * as path from "path";

const dataDir = path.resolve(__dirname, "../data/2026");
const outDir = path.resolve(__dirname, "../lib/data");

interface ArtistAttributes {
  name: string;
  thumbnail?: { url?: string | null } | null;
}

interface ArtistItem {
  id: string | number;
  attributes: ArtistAttributes;
}

interface FestivalDateRelationship {
  data: { id: string | number };
}

interface StageRelationship {
  data: { id: string | number };
}

interface ArtistRelationship {
  data: { id: string | number };
}

interface TimetableAttributes {
  start_at: number;
  finish_at: number;
}

interface TimetableRelationships {
  festival_date: FestivalDateRelationship;
  artist: ArtistRelationship;
  stage: StageRelationship;
}

interface TimetableItem {
  id: string | number;
  attributes: TimetableAttributes;
  relationships: TimetableRelationships;
}

interface StageAttributes {
  name: string;
  area?: string;
  lat?: number;
  lng?: number;
}

interface StageRelationships {
  spot?: { data?: { id: string } | null };
}

interface StageItem {
  id: string | number;
  type: string;
  attributes: StageAttributes;
  relationships?: StageRelationships;
}

interface ArtistsJson {
  data: ArtistItem[];
}

interface TimetablesJson {
  data: TimetableItem[];
  included: StageItem[];
}

const artistsJson: ArtistsJson = JSON.parse(fs.readFileSync(path.join(dataDir, "all-artists.json"), "utf-8"));
const timetablesJson: TimetablesJson = JSON.parse(fs.readFileSync(path.join(dataDir, "all-timetables.json"), "utf-8"));

// --- Venues ---
// Spot details loaded from individually fetched files
const spotFiles: Record<string, string> = {
  "1": "105_v1_spots_1.json",
  "3": "90_v1_spots_3.json",
  "4": "spot_4.json",
  "5": "101_v1_spots_5.json",
  "6": "95_v1_spots_6.json",
  "10": "68_v1_spots_10.json",
  "11": "71_v1_spots_11.json",
  "12": "59_v1_spots_12.json",
  "13": "64_v1_spots_13.json",
  "20": "50_v1_spots_20.json",
  "21": "67_v1_spots_21.json",
  "22": "spot_22.json",
};

const spotNameOverrides: Record<string, string> = {
  "21": "SHIBUYA FOWS", // API erroneously labels this as LINE CUBE SHIBUYA
};

const spots: Array<{
  id: string;
  name: string;
  lat: number;
  lng: number;
  area: string;
}> = [];

for (const [spotId, fileName] of Object.entries(spotFiles)) {
  const p = path.join(dataDir, fileName);
  if (!fs.existsSync(p)) {
    console.warn(`Missing spot file: ${fileName}`);
    continue;
  }
  const json = JSON.parse(fs.readFileSync(p, "utf-8"));
  const attrs = json.data.attributes;
  const name = spotNameOverrides[spotId] || attrs.name;
  const areaRaw = attrs.area || "";
  const area = areaRaw.includes("A") ? "A" : areaRaw.includes("B") ? "B" : "other";
  spots.push({ id: spotId, name, lat: attrs.lat, lng: attrs.lng, area });
}

// Assign consistent colors
const colors = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#ec4899", // pink
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#d946ef", // fuchsia
  "#f97316", // orange
  "#a855f7", // purple
  "#14b8a6", // teal
];

const venueIdMap: Record<string, string> = {
  "1": "o-east",
  "3": "duo",
  "4": "o-west",
  "5": "clubasia",
  "6": "o-nest",
  "10": "quattro",
  "11": "veats",
  "12": "www",
  "13": "wwwx",
  "20": "tokio-tokyo",
  "21": "fows",
  "22": "7thfloor",
};

const venuesTs = `export interface Venue {
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
${spots
    .map(
      (s, i) => `  {
    id: "${venueIdMap[s.id]}",
    spotId: "${s.id}",
    name: "${s.name}",
    lat: ${s.lat},
    lng: ${s.lng},
    area: "${s.area}",
    color: "${colors[i % colors.length]}",
  }`,
    )
    .join(",\n")}
];

export const venueMap = new Map(venues.map((v) => [v.id, v]));
export const spotToVenueId = new Map(venues.map((v) => [v.spotId, v.id]));
`;

fs.writeFileSync(path.join(outDir, "venues.ts"), venuesTs, "utf-8");
console.log("Wrote venues.ts");

// --- Artists ---
const artists = artistsJson.data.map((a) => ({
  id: String(a.id),
  name: a.attributes.name,
  thumbnail: a.attributes.thumbnail?.url || null,
}));

const artistsTs = `export interface Artist {
  id: string;
  name: string;
  thumbnail?: string | null;
}

export const artists: Artist[] = ${JSON.stringify(artists, null, 2)};

export const artistMap = new Map(artists.map((a) => [a.id, a]));
`;

fs.writeFileSync(path.join(outDir, "artists.ts"), artistsTs, "utf-8");
console.log("Wrote artists.ts");

// --- Timetable ---
const artistMap = new Map(artistsJson.data.map((a) => [String(a.id), a.attributes.name]));
const stageMap = new Map<string, StageItem>(
  timetablesJson.included
    .filter((x) => x.type === "stage")
    .map((s) => [String(s.id), s]),
);

const realDates = new Set(["1", "2"]);
const timetableRows = timetablesJson.data
  .filter((t) => realDates.has(String(t.relationships.festival_date.data.id)))
  .filter((t) => {
    const start = t.attributes.start_at;
    const finish = t.attributes.finish_at;
    return typeof start === "number" && typeof finish === "number" && finish > start;
  })
  .map((t) => {
    const artistId = String(t.relationships.artist.data.id);
    const stageId = String(t.relationships.stage.data.id);
    const stage = stageMap.get(stageId);
    const spotRel = stage?.relationships?.spot?.data;
    const venueId = spotRel ? venueIdMap[spotRel.id] : null;
    return {
      id: String(t.id),
      artistId,
      artistName: artistMap.get(artistId) || "Unknown",
      stageId,
      stageName: stage?.attributes?.name || "Unknown",
      venueId,
      day: t.relationships.festival_date.data.id === "1" ? 1 : 2,
      startAt: Math.round(t.attributes.start_at),
      finishAt: Math.round(t.attributes.finish_at),
    };
  })
  .sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    if (a.startAt !== b.startAt) return a.startAt - b.startAt;
    return a.stageId.localeCompare(b.stageId);
  });

const timetableTs = `export interface TimetableSet {
  id: string;
  artistId: string;
  artistName: string;
  stageId: string;
  stageName: string;
  venueId: string | null;
  day: 1 | 2;
  startAt: number; // Unix timestamp (seconds)
  finishAt: number; // Unix timestamp (seconds)
}

export const timetable: TimetableSet[] = ${JSON.stringify(timetableRows, null, 2)};

export const day1Timetable = timetable.filter((t) => t.day === 1);
export const day2Timetable = timetable.filter((t) => t.day === 2);
`;

fs.writeFileSync(path.join(outDir, "timetable.ts"), timetableTs, "utf-8");
console.log("Wrote timetable.ts");

// --- Stage to Venue mapping helper ---
const stageToVenueRows = Array.from(stageMap.entries())
  .map(([id, stage]) => {
    const spotRel = stage?.relationships?.spot?.data;
    return {
      stageId: id,
      stageName: stage.attributes?.name || "Unknown",
      spotId: spotRel?.id || null,
      venueId: spotRel ? venueIdMap[spotRel.id] || null : null,
    };
  })
  .sort((a, b) => parseInt(a.stageId) - parseInt(b.stageId));

console.log("\nStage → Venue mapping:");
console.table(stageToVenueRows);
console.log(`\nTotal timetable entries for Apr 11–12: ${timetableRows.length}`);
