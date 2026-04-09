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
  attributes: { name: string };
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

  // The timetables JSON includes artists and stages in "included" array (JSON:API format)
  // Let's check if there is an "included" array. Usually there is.
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

  let discrepancies = 0;
  console.log("=== CROSS-REFERENCING API VS INTERNAL PDF DATA ===");

  for (const apiSet of timetablesRaw.data as ApiTimetable[]) {
    const artistId = apiSet.relationships.artist.data?.id;
    // const stageId = apiSet.relationships.stage.data?.id;
    // const dateId = apiSet.relationships.festival_date.data?.id; // '1' = day 1, '2' = day 2 (usually)
    
    // We map dateId '1' to April 11, '2' to April 12. Let's see how they match.
    // In our internal array: day: 1 or 2
    
    const internalSet = internalTimetable.find(
      (s) => s.id === apiSet.id || (s.artistId === artistId && s.startAt === apiSet.attributes.start_at)
    );

    const artistName = artistsMap.get(artistId)?.attributes.name ?? `Unknown Artist ${artistId}`;

    if (!internalSet) {
      console.log(`\u274c MISSING IN INTERNAL DATA: [${artistName}] is missing or start time shifted.`);
      discrepancies++;
      continue;
    }

    // Verify times
    if (internalSet.startAt !== apiSet.attributes.start_at) {
      console.log(`\u26A0\uFE0F TIME MISMATCH: [${artistName}] Start time: API=${apiSet.attributes.start_at}, PDF=${internalSet.startAt}`);
      discrepancies++;
    }
    if (internalSet.finishAt !== apiSet.attributes.finish_at) {
      console.log(`\u26A0\uFE0F TIME MISMATCH: [${artistName}] Finish time: API=${apiSet.attributes.finish_at}, PDF=${internalSet.finishAt}`);
      discrepancies++;
    }
  }

  // Check reversed (in PDF but not in API)
  for (const internalSet of internalTimetable) {
    const apiSet = (timetablesRaw.data as ApiTimetable[]).find(
      (s) => s.id === internalSet.id || (s.relationships.artist.data?.id === internalSet.artistId && s.attributes.start_at === internalSet.startAt)
    );
    if (!apiSet) {
      console.log(`\u274c ORPHANED IN INTERNAL DATA: [${internalSet.artistName}] (ID ${internalSet.id}) is not in the API.`);
      discrepancies++;
    }
  }

  console.log("\n=== SUMMARY ===");
  if (discrepancies === 0) {
    console.log("\u2714\uFE0F 100% Match! PDF OCR matches API perfectly.");
  } else {
    console.log(`\u26A0\uFE0F Found ${discrepancies} discrepancies requiring manual calibration!`);
  }
}

main().catch(console.error);
