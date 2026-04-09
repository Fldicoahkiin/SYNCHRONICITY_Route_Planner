import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/2026"
);
const OUT_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../lib/data/timetable.ts"
);

interface ApiTimetable {
  id: string;
  attributes: { start_at: number; finish_at: number };
  relationships: {
    artist: { data: { id: string } };
    stage: { data: { id: string } };
    festival_date: { data: { id: string } };
  };
}

interface ApiStage {
  id: string;
  attributes: { name: string };
}
interface ApiArtist {
  id: string;
  attributes: { name: string };
}

async function readJson(filename: string) {
  const filePath = path.join(DATA_DIR, filename);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

// Ensure stable mappings between the Fespli API stage names and our IDs
function inferVenueId(stageName: string): string | null {
  const s = stageName.toLowerCase();
  if (s.includes("east")) return "o-east";
  if (s.includes("west")) return "o-west";
  if (s.includes("nest")) return "o-nest";
  if (s.includes("quattro")) return "quattro";
  if (s.includes("clubasia")) return "clubasia";
  if (s.includes("wwwx")) return "wwwx";
  if (s.includes("www")) return "www";
  if (s.includes("duo")) return "duo";
  if (s.includes("veats")) return "veats";
  if (s.includes("7thfloor") || s.includes("7th flooor")) return "7thfloor";
  if (s.includes("tokio tokyo")) return "tokio-tokyo";
  if (s.includes("fows") || s.includes("shibuya fows")) return "fows";
  return null;
}

async function main() {
  const [artistsRaw, timetablesRaw] = await Promise.all([
    readJson("all-artists.json"),
    readJson("all-timetables.json"),
  ]);

  const artistsMap = new Map<string, ApiArtist>();
  for (const item of artistsRaw.data) {
    if (item.type === "artist") artistsMap.set(item.id, item as ApiArtist);
  }

  const stagesMap = new Map<string, ApiStage>();
  if (timetablesRaw.included) {
    for (const item of timetablesRaw.included) {
      if (item.type === "stage") stagesMap.set(item.id, item as ApiStage);
      if (item.type === "artist") artistsMap.set(item.id, item as ApiArtist);
    }
  }

  interface OutSet {
    id: string;
    artistId: string;
    artistName: string;
    stageId: string;
    stageName: string;
    venueId: string | null;
    day: 1 | 2;
    startAt: number;
    finishAt: number;
  }
  const outSets: OutSet[] = [];
  const apiData = timetablesRaw.data as ApiTimetable[];

  for (const apiSet of apiData) {
    const artistId = apiSet.relationships.artist.data?.id;
    const stageId = apiSet.relationships.stage.data?.id;
    const dateId = apiSet.relationships.festival_date.data?.id;

    if (!artistId || !stageId) continue;

    const artistName = artistsMap.get(artistId)?.attributes.name ?? `Artist ${artistId}`;
    const stageName = stagesMap.get(stageId)?.attributes.name ?? `Stage ${stageId}`;

    const venueId = inferVenueId(stageName);

    // According to data/2026/all-festival-dates.json, "1" is probably April 11 (day 1) and "2" is April 12.
    // If we look at the startAt timestamp, 1775880000 = Sat April 11 2026 13:00 JST.
    // Let's use startAt to dynamically decide the day relative to 1775952000 (Sunday Midnight boundary).
    const startAt = apiSet.attributes?.start_at;
    const finishAt = apiSet.attributes?.finish_at;
    if (!startAt || !finishAt) continue;
    
    // 1775923200 is Sun, 12 Apr 2026 01:00:00 JST
    // A cutoff like 1775960000 would be Sunday morning. Let's just use:
    // If start_at < 1775950000 -> Day 1 (April 11), else Day 2
    const day = dateId === "1" ? 1 : 2; 

    // We noticed 'Talk Live & Rest Space' was orphaned.
    // It's manually added or unmapped. We'll reconstruct identically.
    outSets.push({
      id: apiSet.id,
      artistId,
      artistName,
      stageId,
      stageName,
      venueId,
      day,
      startAt,
      finishAt,
    });
  }

  // Sort chronologically then by stage
  outSets.sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt - b.startAt;
    return a.stageId.localeCompare(b.stageId);
  });

  const outputContent = `export interface TimetableSet {
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

export const timetable: TimetableSet[] = ${JSON.stringify(outSets, null, 2)};
`;

  await fs.writeFile(OUT_FILE, outputContent, "utf-8");
  console.log(`\u2714 Generated ${outSets.length} sets and saved to ${OUT_FILE}`);
}

main().catch(console.error);
