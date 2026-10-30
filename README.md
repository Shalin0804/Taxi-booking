# TTT Cabs website

```
npm install
npm run dev      # local dev
npm run build    # production build + per-route meta (dist/)
```

Deploy `dist/` to any static host that serves `/route/index.html` for `/route`, with a fallback to `/index.html` for unknown routes (SPA).
The API lives in `server/`. See DEPLOY.md to deploy on Vercel, Render and TiDB Cloud, and AGENTS.md for project rules.
