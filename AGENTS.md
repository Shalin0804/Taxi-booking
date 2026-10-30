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
2. **Never fake a confirmation.** Forms submit through `src/lib/api.js`. If a request fails, the UI says nothing was sent and offers WhatsApp, email or a call.
7. **Booking requires a customer login**, and the server enforces this. "Plan your ride" renders no fields for visitors; `/book` and `/my-account` are wrapped in `RequireCustomer`, which redirects to `/login?next=…` (only same-site paths are accepted, via `safeNext`).
8. **The admin portal is only at `/secure-admin-portal`** (`src/admin/base.js`). Never link it from the public site, and never add an admin sign-up page. `/admin` is a normal 404.
3. **Page meta** lives in `src/data/seo.js` (used at runtime and at build). For a new route, add it there, to `public/sitemap.xml` and to `App.jsx`.
4. **Scroll effects** are declarative data attributes handled by `useScrollFx` (wrap page content in `<Page>`): `data-reveal`, `data-stagger` (on a parent), `data-mask`, `data-parallax="0.1"`, `data-counter="11"`. Initial hidden states apply only under `html.fx`, which is set when motion is allowed, so reduced-motion and no-JS visitors always see content.
5. **Images** are WebP in `public/images/<name>-800.webp` / `-1400.webp` (hero: 720/1200/2000), rendered via `<Picture name>`. Photos are from Unsplash (free licence), chosen to show Indian vehicles and locations. Note that `hero` is mirrored.
6. Never put a `position: fixed` element inside `<header>`: its `backdrop-filter` makes the header the containing block (this is why the mobile menu is rendered outside it).

## Backend (`server/`)

- Express 5 + mysql2, which also works with TiDB. The schema is in `server/src/schema.sql` and is applied idempotently on every boot.
- No ORM (Prisma was considered and skipped). Plain SQL with `?` placeholders keeps the queries visible and works the same on TiDB.
- Auth (`server/src/auth.js`) has two separate contexts in one `users` table:
  - Customers use the `ttt_customer` cookie and `/api/auth/*` + `/api/bookings*` + `/api/me*`, with role `CUSTOMER` only.
  - Staff use the `ttt_admin` cookie and `/api/admin/*`, with roles `SUPER_ADMIN`, `ADMIN`, `BOOKING_MANAGER`, `FLEET_MANAGER` and `SUPPORT_STAFF`.
  - Cookies are httpOnly, SameSite=Lax, and Secure in production. Each JWT points at a `sessions` row, so logout, disabling an account and password changes take effect immediately. The role is re-read on every request.
- Permissions are the `P` map in `auth.js`; every admin route uses `requireAdmin('<perm>')`. The UI hides what the API would refuse, using `user.permissions` from `/api/admin/auth/me`.
- CSRF: every non-GET request must send `X-Requested-With: ttt` (`request()` adds it), and a foreign `Origin` is rejected.
- Lockout: 5 failed logins lock the account for 15 minutes (`login.js`), on top of the per-IP rate limits. Password reset uses a single-use, SHA-256-hashed token that expires in 30 minutes. Emails go through `SMTP_URL`, or to the server log if it's unset.
- Admin changes are written to `audit_logs` via `audit(req, ...)`. SUPER_ADMIN sees them under Team & roles → Audit log.
- The frontend calls `/api` on its own origin: Vite proxies it in dev and preview, and `vercel.json` rewrites it to Render. `VITE_API_URL` is an optional override.
- There are no migrations yet: `schema.sql` only creates missing tables. Changing an existing table needs an `ALTER` (or a fresh database, before launch).
- Commands (run in `server/`): `npm run dev`, `npm test` (end-to-end against `DATABASE_URL`; **use a test DB**), `npm run create-admin` (credentials come from env, never from code).
- All SQL uses `?` placeholders. Table and column names come only from code constants and whitelists.
- The CSV export neutralises cells that start with `= + - @`, so they can't run as Excel formulas.
- Admin UI is in `src/admin/`. It has its own layout, with no public navbar or footer. `ResourcePage` in `Resources.jsx` drives vehicles, drivers and pricing from a field config.
- Not built yet: website CMS, booking notifications (email/SMS), online payments (Payment history lists fares for completed trips).
- Deployment: see DEPLOY.md (Vercel, Render and TiDB Cloud).

## Open items for the client

- Original logo artwork: the live logo URL (crmbeta.traviyo.in) is broken, so a wordmark stands in.
- Office address (blank on the live site), and real Twitter/LinkedIn URLs (the live links are generic placeholders and are omitted).
- The live site's SSL certificate has expired.
- Spelling of the legal name: the live site uses both "Tahshildar Tour & Travels" and "Tashildar Tour and Travel". This site uses the former.
