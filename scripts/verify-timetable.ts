import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TARGET_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/2026"
);

// We define minimal structures to parse the JSON:API data
interface ApiArtist {
  id: string;
  attributes: { name: string; phonetic_name: string };
}
interface ApiStage {
  id: string;
  attributes: { name: string; color_name?: string };
}
interface ApiTimetable {
  id: string;
  attributes: { start_at: number; finish_at: number };
  relationships: {
    artist: { data: { id: string } };
    stage: { data: { id: string } };
    festival_date: { data: { id: string } };
  };
}

async function readJson(filename: string) {
  const filePath = path.join(TARGET_DIR, filename);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

async function main() {
  const [artistsRaw, timetablesRaw] = await Promise.all([
    readJson("all-artists.json"),
    readJson("all-timetables.json"),
  ]);

  const artistsMap = new Map<string, ApiArtist>();
  for (const item of artistsRaw.data) {
    if (item.type === "artist") artistsMap.set(item.id, item);
  }

  const stagesMap = new Map<string, ApiStage>();
  if (timetablesRaw.included) {
    for (const item of timetablesRaw.included) {
      if (item.type === "stage") stagesMap.set(item.id, item);
      if (item.type === "artist") artistsMap.set(item.id, item);
    }
  }

  const { timetable: internalTimetable } = await import(
    "../lib/data/timetable"
  );

  // Build fast lookup maps for internal data
  const internalById = new Map(internalTimetable.map((s) => [s.id, s]));
  const internalByArtistStart = new Map<string, (typeof internalTimetable)[number]>();
  for (const s of internalTimetable) {
    internalByArtistStart.set(`${s.artistId}:${s.startAt}`, s);
  }

  let discrepancies = 0;
  console.log("=== CROSS-REFERENCING API VS INTERNAL DATA ===");

  for (const apiSet of timetablesRaw.data as ApiTimetable[]) {
    const artistId = apiSet.relationships.artist.data?.id;
    const stageId = apiSet.relationships.stage.data?.id;
    const dateId = apiSet.relationships.festival_date.data?.id;

    if (!artistId || !stageId) continue;

    const artistName = artistsMap.get(artistId)?.attributes.name ?? `Unknown Artist ${artistId}`;
    const stage = stagesMap.get(stageId);
    const stageName = stage?.attributes.name ?? `Stage ${stageId}`;

    // Only verify entries that belong to supported festival days.
    // Pre/post event dates (100, 101) are intentionally skipped by regenerate-timetable.ts.
    if (dateId !== "1" && dateId !== "2") {
      // If this unsupported date exists in internal data, that's an unexpected discrepancy.
      if (internalById.has(apiSet.id)) {
        console.log(`\u274c UNSUPPORTED DATE IN INTERNAL: [${artistName}] dateId=${dateId}`);
        discrepancies++;
      }
      continue;
    }

    // Missing start/finish times in the API are also skipped during generation.
    if (!apiSet.attributes.start_at || !apiSet.attributes.finish_at) {
      if (internalById.has(apiSet.id)) {
        console.log(`\u274c MISSING API TIMES IN INTERNAL: [${artistName}] stage=${stageName}`);
        discrepancies++;
      }
      continue;
    }

    // Try strict ID match first, then fallback to (artistId, startAt) composite key.
    const internalSet =
      internalById.get(apiSet.id) ??
      internalByArtistStart.get(`${artistId}:${apiSet.attributes.start_at}`);

    if (!internalSet) {
      console.log(
        `\u274c MISSING IN INTERNAL DATA: [${artistName}] stage=${stageName} start=${apiSet.attributes.start_at}`
      );
      discrepancies++;
      continue;
    }

    // Verify times
    if (internalSet.startAt !== apiSet.attributes.start_at) {
      console.log(
        `\u26A0\uFE0F TIME MISMATCH: [${artistName}] Start time: API=${apiSet.attributes.start_at}, INTERNAL=${internalSet.startAt}`
      );
      discrepancies++;
    }
    if (internalSet.finishAt !== apiSet.attributes.finish_at) {
      console.log(
        `\u26A0\uFE0F TIME MISMATCH: [${artistName}] Finish time: API=${apiSet.attributes.finish_at}, INTERNAL=${internalSet.finishAt}`
      );
      discrepancies++;
    }

    // Verify stage / venue mapping
    if (internalSet.stageName !== stageName) {
      console.log(
        `\u26A0\uFE0F STAGE NAME MISMATCH: [${artistName}] API="${stageName}", INTERNAL="${internalSet.stageName}"`
      );
      discrepancies++;
    }
    if (!internalSet.venueId) {
      console.log(
        `\u26A0\uFE0F MISSING VENUE ID: [${artistName}] stage=${stageName}`
      );
      discrepancies++;
    }
  }

  // Check reversed (in internal but not in API)
  const apiById = new Map<string, ApiTimetable>();
  const apiByArtistStart = new Map<string, ApiTimetable>();
  for (const s of timetablesRaw.data as ApiTimetable[]) {
    apiById.set(s.id, s);
    if (s.attributes.start_at) {
      const artistId = s.relationships.artist.data?.id;
      if (artistId) {
        apiByArtistStart.set(`${artistId}:${s.attributes.start_at}`, s);
      }
    }
  }

  for (const internalSet of internalTimetable) {
    const apiSet =
      apiById.get(internalSet.id) ??
      apiByArtistStart.get(`${internalSet.artistId}:${internalSet.startAt}`);
    if (!apiSet) {
      console.log(
        `\u274c ORPHANED IN INTERNAL DATA: [${internalSet.artistName}] (ID ${internalSet.id}) is not in the API.`
      );
      discrepancies++;
    }
  }

  console.log("\n=== SUMMARY ===");
  if (discrepancies === 0) {
    console.log("\u2714\uFE0F 100% Match! Internal timetable matches API perfectly.");
  } else {
    console.log(`\u26A0\uFE0F Found ${discrepancies} discrepancies requiring manual calibration!`);
  }
}

main().catch(console.error);
