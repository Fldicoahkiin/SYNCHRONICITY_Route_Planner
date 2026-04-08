<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Notes

## Stack

- Next.js 16.2.2 with App Router, React 19, TypeScript, Tailwind CSS 4
- HeroUI is the preferred component library for new UI work
- Leaflet / react-leaflet power the in-app map experience
- OCR import uses `tesseract.js`

## Working Areas

- `app/[locale]/` contains localized routes for browse, timetable, map, and plan
- `components/` contains presentation and export UI such as timetable boards and route sheets
- `lib/data/` holds verified festival data loaders and venue metadata
- `lib/utils/` holds route planning, routing, OCR import, map URL helpers, and scoring logic
- `lib/i18n/locales/{ja,en,zh}.ts` are the source of truth for user-facing copy
- `data/2026/` contains the official timetable PDFs and normalized JSON data

## Project Rules

- Use `pnpm`, not `npm`
- Keep route planning logic centralized in `lib/utils/route-planner.ts`, `lib/utils/routing.ts`, and related helpers instead of page-level special cases
- Keep map provider URL generation in shared helpers such as `lib/utils/map-urls.ts` and `lib/utils/google-maps.ts`
- When changing timetable or OCR behavior, verify against `data/2026/official-timetable-0411.pdf` and `data/2026/official-timetable-0412.pdf`
- Add every new user-facing string to all three locale files in the same change

## Validation

- Run `pnpm lint`
- Run `pnpm typecheck`
- Run `pnpm build`
- After frontend changes, verify the affected flow in a browser

## Skill And Harness Layout

- `skills/` stores project-local skill definitions and reference material that are meant to live in the repo
- `.agents/skills/` and `.claude/skills/` are agent-facing copies; keep shared skill names and intent aligned when updating them
- Treat `.claude/settings.local.json` as machine-local state, not project source of truth

## Git

- Use Conventional Commits
- Do not add `Co-authored-by` or other AI attribution
