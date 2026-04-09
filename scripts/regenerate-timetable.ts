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
  attributes: { name: string; color_name?: string };
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

// Stable mapping from known API stage IDs to our internal venue IDs.
// This takes precedence over name-based inference because stage IDs are stable
// and sub-stages (e.g. O-EAST 2nd) share the same spot/parent name.
const stageIdToVenueId = new Map<string, string>([
  ["1", "o-east"],
  ["2", "o-east-2nd"],
  ["3", "duo"],
  ["4", "o-west"],
  ["5", "clubasia"],
  ["6", "o-nest"],
  ["7", "o-nest-2nd"],
  ["10", "quattro"],
  ["11", "veats"],
  ["12", "www"],
  ["13", "wwwx"],
  ["18", "linecube"],
  ["20", "tokio-tokyo"],
  ["21", "fows"],
  ["22", "7thfloor"],
  ["23", "o-east-3f"],
  ["25", "duo"], // pre-event stage with same name as main duo stage
]);

// Fallback name+color_name inference for any new stages not in the hardcoded map above.
function inferVenueId(stageName: string, colorName?: string): string | null {
  const s = stageName.toLowerCase();
  const c = (colorName ?? "").toLowerCase();

  // Sub-stages must be checked before parent stages
  if (c === "east2nd" || s.includes("east 2nd")) return "o-east-2nd";
  if (c === "east3f" || s.includes("east 3f") || s.includes("3f lobby")) return "o-east-3f";
  if (c === "nest2nd") return "o-nest-2nd";

  // Main stages
  if (s.includes("line cube") || s.includes("linecube")) return "linecube";
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
    const stage = stagesMap.get(stageId);
    const stageName = stage?.attributes.name ?? `Stage ${stageId}`;
    const stageColorName = stage?.attributes.color_name;

    const venueId =
      stageIdToVenueId.get(stageId) ?? inferVenueId(stageName, stageColorName);

    if (!venueId) {
      console.warn(
        `⚠️ Skipping unmapped stage: "${stageName}" (id=${stageId}, color=${stageColorName}, artist=${artistName})`
      );
      continue;
    }

    // The app currently only supports the two main festival days.
    // dateId "100" / "101" are pre/post events that should not be mixed into day 1/2.
    if (dateId !== "1" && dateId !== "2") {
      console.warn(
        `⚠️ Skipping unsupported dateId ${dateId}: "${stageName}" | ${artistName}`
      );
      continue;
    }

    const startAt = apiSet.attributes?.start_at;
    const finishAt = apiSet.attributes?.finish_at;
    if (!startAt || !finishAt) {
      console.warn(
        `⚠️ Skipping missing time: "${stageName}" | ${artistName} (start=${startAt}, finish=${finishAt})`
      );
      continue;
    }

    const day = dateId === "1" ? 1 : 2;

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
