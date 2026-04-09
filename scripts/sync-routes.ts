import { config } from "dotenv";
import { resolve } from "path";
import * as fs from "fs/promises";
import { venues } from "../lib/data/venues";
import { routeOverrides } from "../lib/data/route-overrides";

config({ path: resolve(process.cwd(), ".env.local") });

const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions/foot-walking";

interface RouteData {
  minutes: number;
  distanceMeters: number;
  geometry: [number, number][];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    console.error("Missing ORS_API_KEY in .env.local");
    process.exit(1);
  }

  const cache: Record<string, RouteData> = {};
  const cachePath = resolve(process.cwd(), "lib/data/routes-cache.json");

  console.log(`Starting to fetch ${venues.length * (venues.length - 1)} routes.`);

  for (const from of venues) {
    for (const to of venues) {
      if (from.id === to.id) continue;

      const pairKey = `${from.id}->${to.id}`;
      const override = routeOverrides[pairKey];

      const coordinates = [
        [from.lng, from.lat]
      ];
      if (override?.via) {
        coordinates.push(...override.via);
      }
      coordinates.push([to.lng, to.lat]);

      let success = false;
      let retries = 3;

      while (!success && retries > 0) {
        try {
          const response = await fetch(ORS_BASE_URL, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: apiKey,
            },
            body: JSON.stringify({
              coordinates,
              format: "geojson",
            }),
          });

          if (!response.ok) {
             if (response.status === 429) {
              console.log(`Rate limited! Sleeping 5s...`);
              await sleep(5000);
              retries--;
              continue;
             }
             if (response.status === 404) {
               console.warn(`[WARNING] No routing path available natively for ${pairKey}! Falling back to direct line.`);
               cache[pairKey] = {
                 minutes: 5,
                 distanceMeters: 500,
                 geometry: [[from.lat, from.lng], [to.lat, to.lng]]
               };
               success = true;
               break;
             }
             const errText = await response.text();
             throw new Error(`Status ${response.status}: ${errText}`);
          }

          const payload = await response.json();
          const route = payload.routes?.[0];
          if (!route) throw new Error("No route returned");

          const geoGeometry: [number, number][] = route.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );

          cache[pairKey] = {
            minutes: Math.max(1, Math.round(route.summary.duration / 60)),
            distanceMeters: Math.round(route.summary.distance),
            geometry: geoGeometry,
          };
          success = true;
          console.log(`[SUCCESS] ${pairKey}`);
          
          await sleep(1500); 
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error(`[ERROR] ${pairKey} - ${errMsg}`);
          await sleep(2000);
          retries--;
        }
      }
      if (!success) {
        console.error(`Failed to fetch ${pairKey} completely.`);
      }
    }
  }

  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2));
  console.log(`\nCache saved to ${cachePath}`);
}

main().catch(console.error);
