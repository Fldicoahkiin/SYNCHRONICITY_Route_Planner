# SYNCHRONICITY'26 Route Planner

> **Unofficial fan-made tool** for planning your SYNCHRONICITY'26 festival route in Shibuya.
>
> This project is **not affiliated with, endorsed by, or officially connected** to the SYNCHRONICITY festival organizers.

## Features

- **Browse** – View the full two-day lineup on an interactive timetable board, filter by venue, and mark favorites.
- **Plan** – Auto-generate a walking route between your favorites with real venue-to-venue transit times and a feasibility score. Export as a high-res PNG or open directly in Apple Maps / Google Maps.
- **Image Import** – Upload a screenshot from the official SYNCHRONICITY app timetable; the app runs OCR entirely in your browser to auto-populate favorites. No image ever leaves your device.
- **i18n** – Japanese, English, and Chinese UI with browser locale detection and persisted preference.
- **PWA** – Installable on mobile for offline-capable use after the first load.

## Architecture

```
app/[locale]/              # Localized routes (browse, timetable, plan)
components/                # Timetable board, route timeline, venue map, import modal
lib/data/                  # TypeScript data layer: timetable, artists, venues, walking matrix
lib/utils/                 # Route planner, OCR engine, scoring, map URL helpers
lib/i18n/                  # Client-side i18n (ja / en / zh locale files)
data/2026/                 # Upstream API mirror: JSON + official PDF timetables
scripts/                   # Data sync & regeneration tooling
```

## Tech Stack

| Layer       | Technology                                                                       |
| ----------- | -------------------------------------------------------------------------------- |
| Framework   | [Next.js 16](https://nextjs.org/) (App Router, fully static SSG export)          |
| Styling     | [Tailwind CSS v4](https://tailwindcss.com/) + `@base-ui/react` primitives        |
| OCR         | [tesseract.js v7](https://github.com/naptha/tesseract.js) (client-side WASM)     |
| Map         | [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) |
| i18n        | [react-i18next](https://react.i18next.com/) (client-only, no middleware)         |
| Testing     | [Vitest](https://vitest.dev/)                                                    |

### OCR Pipeline

- Canvas preprocessing (2× upscale + contrast boost) before recognition
- PSM 11 (sparse text) mode for scattered artist names on timetable images
- Multi-stage matching: exact case-insensitive → substring containment → Levenshtein fuzzy match
- 100% exact artist matches are boosted past minimum thresholds even without time/stage context
- Automatic day detection from image header (`4.11` / `4.12` date mapping)
- Graceful fallback from `jpn+eng` to `eng` if Japanese trained data is unavailable
- Overlap conflict warnings use interval clustering (grouping `A · B · C` instead of pairwise)

### Route Planner

- Greedy scheduling based on a pre-computed venue-to-venue walking matrix
- Calculates buffer time between consecutive sets and flags impossible transitions
- Generates a feasibility score per route

### i18n

- Locale detection order: `localStorage` → `navigator.language` → `ja`
- No server-side locale switching; root `/` redirects client-side to preferred locale

## Development

```bash
pnpm install
pnpm dev
```

Other useful commands:

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript check
pnpm build       # Production build
pnpm test        # Vitest
```

## Data Synchronization

The app's data layer is derived from the official festival backend API. See [`data/2026/README.md`](data/2026/README.md) for endpoint details.

```bash
# 1. Pull latest JSON from upstream API
pnpm dlx tsx scripts/sync-data.ts

# 2. Regenerate the TypeScript timetable from the API data
pnpm dlx tsx scripts/regenerate-timetable.ts

# 3. (Optional) Verify local timetable against API for drift
pnpm dlx tsx scripts/verify-timetable.ts
```

No personal cookies, API keys, or authentication tokens are required.

## Deploy

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FFldicoahkiin%2FSYNCHRONICITY_Route_Planner)

### Cloudflare Pages

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.pages.cloudflare.com/?url=https://github.com/Fldicoahkiin/SYNCHRONICITY_Route_Planner)

## Data Sources & Copyright Notice

- **Artist names, set times, stage names, and venue information** are sourced from the official SYNCHRONICITY'26 mobile app backend API.
  - Festival dates: **Day 1** – April 10–11 (starts 18:30 JST), **Day 2** – April 11–12 (starts 18:30 JST)
  - Each set's time is validated against official app timestamps to ensure accuracy

- **Venue coordinates and walking times** are pre-computed based on actual venue locations in the Shibuya Dogenzaka / Maruyamacho area.

- All festival-related data, artist names, trademarks, and imagery are the property of their respective rights holders (the SYNCHRONICITY festival organizers, record labels, and artists).

- This project is a **non-commercial, fan-made tool** created for personal convenience purposes. All original code is offered under the **MIT License**; however, the festival data itself remains the property of the official rights holders.

- If you are a rights holder and wish to have any data removed, please open an issue and it will be taken down immediately.

## License

The source code of this project is licensed under the [MIT License](LICENSE).
