# SYNCHRONICITY'26 Sync Data

This directory contains the official festival data mirrored from the Fespli platform API, along with PDF references of the published timetable.

## Contents

| File                          | Description                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `all-artists.json`            | Artist lineup including `phonetic_name` (Romaji / translations used by OCR matching) |
| `all-timetables.json`         | Full performance schedule with stage and artist relational mappings                   |
| `all-spots.json`              | Venue and spot geospatial metadata (coordinates, area classification, etc.)           |
| `official-timetable-0411.pdf` | Official timetable image reference for April 11                                      |
| `official-timetable-0412.pdf` | Official timetable image reference for April 12                                      |

## API Endpoints

The data is passively mirrored from the official festival application backend. All endpoints are open and accessible without authentication via standard HTTP requests (e.g. `curl` or `fetch`).

### Required Parameters

All requests **must** include the `app_version` query parameter. The current value used by the sync scripts is:

```
app_version=6.2.2
```

### Available Endpoints

| Endpoint | Method | Query Parameters | Description |
|----------|--------|------------------|-------------|
| `https://synchronicity2026.api.fespli.com/v1/artists` | GET | `app_version=6.2.2&include_related_artists=true` | Artist data including photography permission tags. `include_related_artists=true` includes associated acts and translations. |
| `https://synchronicity2026.api.fespli.com/v1/timetables` | GET | `app_version=6.2.2` | Start/end UNIX timestamps with JSON:API standard relationships (`artist`, `stage`, `festival_date`). |
| `https://synchronicity2026.api.fespli.com/v1/spots` | GET | `app_version=6.2.2` | List of all venue/spot references. |
| `https://synchronicity2026.api.fespli.com/v1/spots/<id>` | GET | `app_version=6.2.2&include_area=true&include_ground_overlay=true&support_html=true` | Single venue detail with coordinates, thumbnails, and area metadata. `include_area=true` resolves the area relationship; `include_ground_overlay=true` includes map overlay images; `support_html=true` preserves HTML in descriptions. |

### Stage-to-Venue Mapping Notes

When regenerating the local timetable from `all-timetables.json`, keep in mind the following API conventions:

- **Sub-stages** are separate `stage` records that share the same `spot` (parent venue). They are distinguished by `attributes.color_name`. For example:
  - `O-EAST` → `color_name: "east"`
  - `O-EAST 2nd Stage` → `color_name: "east2nd"`
  - `O-EAST 3F LOBBY` → `color_name: "east3f"`
  - `O-nest` → `color_name: "nest"`
  - `O-nest 2nd` → `color_name: "nest2nd"`
- **Date IDs** in the API:
  - `1` → Day 1 (April 11)
  - `2` → Day 2 (April 12)
  - `100` / `101` → Pre / post events (not included in the app timetable)

## Scripts

The following scripts in the project root `scripts/` directory manage data synchronization:

| Script                     | Command                                        | Description                                               |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| `sync-data.ts`             | `pnpm dlx tsx scripts/sync-data.ts`            | Download latest JSON from the API, clean null values       |
| `regenerate-timetable.ts`  | `pnpm dlx tsx scripts/regenerate-timetable.ts` | Rebuild `lib/data/timetable.ts` from `all-timetables.json` |
| `verify-timetable.ts`      | `pnpm dlx tsx scripts/verify-timetable.ts`     | Diff local timetable against API to detect drift           |
| `sync-routes.ts`           | `pnpm update-routes`                           | Refresh venue-to-venue walking route geometry cache        |

### Typical Update Flow

```bash
# Pull fresh data from the API
pnpm dlx tsx scripts/sync-data.ts

# Regenerate the TypeScript timetable source of truth
pnpm dlx tsx scripts/regenerate-timetable.ts

# Verify nothing drifted
pnpm dlx tsx scripts/verify-timetable.ts
```

## Legal Notice

- All data remains the property of SYNCHRONICITY and its respective artists and partners.
- This data is collected solely for **personal, non-commercial route-planning convenience** by festival attendees.
- It is **not affiliated with, endorsed by, or sponsored by** the festival organizers.
- If you are a rights holder and wish to have this data removed, please open an issue and it will be taken down immediately.
