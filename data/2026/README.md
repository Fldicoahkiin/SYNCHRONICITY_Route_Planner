# SYNCHRONICITY'26 Festival Data

This repository contains local caches of raw festival data for **SYNCHRONICITY'26** (April 11–12, 2026, Shibuya).

## Contents

| File                          | Description                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `all-artists.json`            | Official artist lineup (includes `phonetic_name` property containing translations/Romaji for OCR support) |
| `all-timetables.json`         | Full performance schedule for the main festival days, including stage and artist relational mappings      |
| `all-spots.json`              | Unified detailed venue/spot geospatial metadata                                                           |
| `official-timetable-0411.pdf` | Official timetable image reference for April 11th                                                         |
| `official-timetable-0412.pdf` | Official timetable image reference for April 12th                                                         |

## API Integration & Source

This data is passively mirrored from the official festival application backend. The endpoints are open and accessible without authentication or private keys via standard HTTP requests (e.g., `curl` or `fetch`), ensuring reproducibility.

Requests require the `app_version` query parameter for routing (e.g., `?app_version=6.2.2`).

To manually synchronize local JSON payloads with live API values, run the provided utility script in the root directory:
`pnpm dlx tsx scripts/sync-data.ts`

### Endpoints Reference

- **Artists & Tags:**
  `GET https://synchronicity2026.api.fespli.com/v1/artists?include_related_artists=true`
  - Includes photography permissions via nested `tags` arrays.
- **Timetable References:**
  `GET https://synchronicity2026.api.fespli.com/v1/timetables`
  - Returns start/end UNIX timestamps and nested JSON:API standard relationships.
- **Venue & Spot Coordinates:**
  `GET https://synchronicity2026.api.fespli.com/v1/spots` & `/v1/spots/<id>`

## Legal / risk note

- **All data remains the property of SYNCHRONICITY and its respective artists and partners.**
- This data is collected solely for **personal, non-commercial route-planning convenience** by festival attendees.
- It is **not affiliated with, endorsed by, or sponsored by** the festival organizers.
- If you are a rights holder and wish to have this data removed, please open an issue and it will be taken down immediately.
- Use of artist thumbnails and venue names follows the same personal/non-commercial scope.
