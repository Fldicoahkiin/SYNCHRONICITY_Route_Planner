# SYNCHRONICITY'26 Route Planner

> **Unofficial fan-made tool** for planning your SYNCHRONICITY'26 festival route in Shibuya.
>
> This project is **not affiliated with, endorsed by, or officially connected** to the SYNCHRONICITY festival organizers.

## Features

- **Timetable** – Browse all sets by day and venue, mark favorites with a single tap.
- **Plan** – Auto-generate an optimal route between your favorites, with real walking times between venues and a feasibility score.
- **Map** – Interactive venue map using Leaflet, with live route visualization.
- **Image Import** – Upload a screenshot from the official SYNCHRONICITY app timetable; the app runs OCR entirely in your browser to auto-populate favorites (no image ever leaves your device).
- **i18n** – Japanese, English, and Chinese UI with browser locale detection and persisted preference.
- **PWA** – Installable on mobile for offline use after the first load.

## Tech Stack & Implementation Details

- **[Next.js](https://nextjs.org/) 16** (App Router, fully static export via SSG `generateStaticParams`)
- **[Tailwind CSS](https://tailwindcss.com/) v4** with `@base-ui/react` primitives
- **[tesseract.js](https://github.com/naptha/tesseract.js)** – Client-side OCR in WebAssembly
  - Canvas preprocessing (2× upscale + contrast boost) before recognition
  - PSM 11 (sparse text) mode for scattered artist names on timetable images
  - Three-stage matching: exact case-insensitive → substring containment → Levenshtein fuzzy match
  - Automatic day detection from image header (`4.11`/`4.12` date mapping)
  - Graceful fallback from `jpn+eng` to `eng` if Japanese trained data is unavailable
- **[react-i18next](https://react.i18next.com/)** – Client-side i18n without middleware
  - Locale detection order: `localStorage` preference → `navigator.language` → `ja`
  - No server-side locale switching; root `/` redirects client-side to preferred locale
- **[Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/)** – Venue map with custom markers
- **Route Planner**
  - Greedy scheduling based on a pre-computed venue-to-venue walking matrix
  - Calculates buffer time between consecutive sets and flags impossible jumps
  - Generates a plan score and text summary for easy sharing
- **PWA**
  - `manifest.webmanifest` for add-to-home-screen
  - Static site can be served from any CDN or static host

## Development

```bash
pnpm install
pnpm run dev
```

Other useful commands:

```bash
pnpm run typecheck   # TypeScript check
pnpm run build       # Production build
```

## Deploy

### Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FFldicoahkiin%2FSYNCHRONICITY_Route_Planner)

### Cloudflare Pages
[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy_to_Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://dash.cloudflare.com/?to=/:account/pages/new)

## Data Sources & Copyright Notice

- **Artist names, set times, stage names, and venue information** are sourced from the **official SYNCHRONICITY mobile app / official website**.
- **Thumbnails and artist images** are served from the festival's official CDN (`storage.fespli.dev`).
- All festival-related data, artist names, trademarks, and imagery are the property of their respective rights holders (the SYNCHRONICITY festival organizers, record labels, and artists).
- This project is a **non-commercial, fan-made tool** created for educational and convenience purposes. All original code is offered under the **MIT License**; however, the festival data itself remains the property of the official rights holders.

## License

The source code of this project is licensed under the [MIT License](LICENSE).
