import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = "https://synchronicity2026.api.fespli.com/v1";
const APP_VERSION = "6.2.2";

const TARGET_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/2026",
);

async function fetchResource(resource: string, queryParams: string = "") {
  const url = `${API_BASE}/${resource}?app_version=${APP_VERSION}${queryParams}`;
  console.log(`Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${resource}`);
  }
  return response.json();
}

function cleanData(data: unknown): unknown {
  // Strip nulls, empty arrays, empty objects from the JSON to save space and make it neat
  if (Array.isArray(data)) {
    return data.map(cleanData);
  }
  if (data !== null && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([, v]) => v !== null && v !== "" && (Array.isArray(v) ? v.length > 0 : true))
        .map(([k, v]) => [k, cleanData(v)])
    );
  }
  return data;
}

async function main() {
  await fs.mkdir(TARGET_DIR, { recursive: true });

  const endpoints = [
    { name: "all-artists", path: "artists", query: "&include_related_artists=true" },
    { name: "all-timetables", path: "timetables", query: "" },
  ];

  for (const ep of endpoints) {
    try {
      const payload = await fetchResource(ep.path, ep.query);
      const cleaned = cleanData(payload);
      const filePath = path.join(TARGET_DIR, `${ep.name}.json`);
      await fs.writeFile(filePath, JSON.stringify(cleaned, null, 2), "utf-8");
      console.log(`\u2714 Saved ${filePath}`);
    } catch (err) {
      console.error(`\u2716 Failed to fetch ${ep.name}:`, err);
    }
  }

  // Next, we fetch individual spots since the API doesn't include everything in the list endpoint.
  // Instead of scattered small JSONs, we can combine them into all-spots.json if that's what the user wants.
  try {
    const spotsList = await fetchResource("spots");
    const spotsData = [];
    for (const spotRef of spotsList.data ?? []) {
      const spotId = spotRef.id;
      const spotDetail = await fetchResource(`spots/${spotId}`, "&include_area=true&include_ground_overlay=true&support_html=true");
      spotsData.push(spotDetail.data);
    }
    const filePath = path.join(TARGET_DIR, `all-spots.json`);
    await fs.writeFile(filePath, JSON.stringify(cleanData({ data: spotsData }), null, 2), "utf-8");
    console.log(`\u2714 Saved ${filePath}`);
  } catch (err) {
    console.error(`\u2716 Failed to fetch spots:`, err);
  }

  console.log("Sync complete! Please run 'pnpm prettier --write data/2026' to ensure standard formatting.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
