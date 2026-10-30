# TTT Cabs website

Project root: `D:\CF\Codes\For demo\TTTCabs`

When calling the claude-code MCP tool, always pass absolute paths under this project root — the tool's working directory is Antigravity's install folder, not this project.

Premium redesign of https://tttcabs.com (Tahshildar Tour & Travels): a React SPA with per-route prerendered meta.

## Stack

- React 19 + Vite 8, React Router 7 (pages lazy-loaded, except Home)
- Tailwind CSS v4 via `@tailwindcss/vite`. Design tokens live in `@theme` in `src/index.css`.
- Framer Motion through `LazyMotion` + `m.*` (strict mode, so **never use `motion.*`**). Used for UI state: menus, booking steps, page transitions.
- GSAP + ScrollTrigger for hero timelines and scroll effects; Lenis for smooth scroll (`src/lib/motion.js`)
- lucide-react icons. Brand icons (Instagram, Facebook) are inline SVGs in `Footer.jsx`.
- Manrope via `@fontsource-variable/manrope` (self-hosted)

## Commands

- `npm run dev`: dev server
- `npm run build`: runs `vite build`, then `scripts/prerender-meta.js`, which writes `dist/<route>/index.html` with per-route title, description, canonical, OG tags and a hero preload
- `npm run preview`: serves `dist`. Use trailing-slash URLs (`/about/`) to get the prerendered HTML; without the slash, preview falls back to the home HTML.

## Rules

1. **Verified content only.** Every business fact (services, fleet categories, cities, phone, email, socials) lives in `src/data/site.js` and comes from the live site. Do not invent vehicles, models, capacities, prices, statistics, reviews or an address. The live About page's "32K bookings / 25+ years / 22 countries" are template filler ("Established in ," is blank), so they are deliberately omitted.
2. **Never fake a confirmation.** Forms submit through `src/lib/api.js`. With no `VITE_API_URL` set, the UI shows a hand-off (WhatsApp, email or call) and says nothing was sent.
3. **Page meta** lives in `src/data/seo.js` (used at runtime and at build). For a new route, add it there, to `public/sitemap.xml` and to `App.jsx`.
4. **Scroll effects** are declarative data attributes handled by `useScrollFx` (wrap page content in `<Page>`): `data-reveal`, `data-stagger` (on a parent), `data-mask`, `data-parallax="0.1"`, `data-counter="11"`. Initial hidden states apply only under `html.fx`, which is set when motion is allowed, so reduced-motion and no-JS visitors always see content.
5. **Images** are WebP in `public/images/<name>-800.webp` / `-1400.webp` (hero: 720/1200/2000), rendered via `<Picture name>`. Photos are from Unsplash (free licence), chosen to show Indian vehicles and locations. Note that `hero` is mirrored.
6. Never put a `position: fixed` element inside `<header>`: its `backdrop-filter` makes the header the containing block (this is why the mobile menu is rendered outside it).

## Backend (`server/`)

- Express 5 + mysql2, which also works with TiDB. The schema is in `server/src/schema.sql` and is applied idempotently on every boot.
- Auth: bcrypt hashes and a JWT bearer token (7 days). The token is stored in localStorage under `ttt_token`. Roles are `customer`, `staff` and `admin`. Staff manage bookings, fleet, drivers and enquiries. Only admins manage pricing and the team.
- The frontend reads the API origin from `VITE_API_URL`. If it is unset, forms fall back to the WhatsApp/email hand-off, and login and admin say the API isn't connected.
- Commands (run in `server/`): `npm run dev`, `npm test` (end-to-end against `DATABASE_URL`; **use a test DB**), `npm run create-admin` (credentials come from env, never from code).
- All SQL uses `?` placeholders. Table and column names come only from code constants and whitelists.
- The CSV export neutralises cells that start with `= + - @`, so they can't run as Excel formulas.
- Admin UI is in `src/admin/`. It has its own layout, with no public navbar or footer. `ResourcePage` in `Resources.jsx` drives vehicles, drivers and pricing from a field config.
- Not built yet: website CMS, notifications (email/SMS), settings page, password reset (customers call support).
- Deployment: see DEPLOY.md (Vercel, Render and TiDB Cloud).

## Open items for the client

- Original logo artwork: the live logo URL (crmbeta.traviyo.in) is broken, so a wordmark stands in.
- Office address (blank on the live site), and real Twitter/LinkedIn URLs (the live links are generic placeholders and are omitted).
- The live site's SSL certificate has expired.
- Spelling of the legal name: the live site uses both "Tahshildar Tour & Travels" and "Tashildar Tour and Travel". This site uses the former.
