// Post-build: writes dist/<route>/index.html with that route's title, description, canonical
// and Open Graph tags, so crawlers and link previews that don't run JS see the right meta.
// The tags carry data-static and main.jsx removes them before React renders its own.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { pageMeta, fullTitle } from '../src/data/seo.js'
import { SITE_URL } from '../src/data/site.js'

const PRIVATE = ['/login', '/register', '/forgot-password', '/reset-password', '/book', '/my-account']
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const base = readFileSync('dist/index.html', 'utf8')

for (const [path, m] of Object.entries(pageMeta)) {
  const title = esc(fullTitle(path, m.title))
  const desc = esc(m.description)
  const url = SITE_URL + path
  const image = SITE_URL + (m.image || '/images/hero-1200.webp')
  const tags = [
    `<title data-static>${title}</title>`,
    `<meta data-static name="description" content="${desc}" />`,
    `<link data-static rel="canonical" href="${url}" />`,
    `<meta data-static property="og:type" content="website" />`,
    `<meta data-static property="og:title" content="${title}" />`,
    `<meta data-static property="og:description" content="${desc}" />`,
    `<meta data-static property="og:url" content="${url}" />`,
    `<meta data-static property="og:image" content="${image}" />`,
    `<meta data-static name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ')
  let html = base.replace(/<title data-static[\s\S]*?<meta data-static name="description"[^>]*>/, tags)
  if (html === base) throw new Error('SEO markers missing from dist/index.html')
  // Account and booking pages are private: keep them out of search results.
  if (PRIVATE.some((p) => path === p || path.startsWith(p + '/'))) html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow" />\n  </head>')
  // The hero preload only belongs on the home page.
  if (path !== '/') html = html.replace(/\s*<link rel="preload" as="image"[^>]*>/, '')
  // Inner pages: preload their own hero so it isn't discovered only after the route chunk loads.
  const hero = m.image?.match(/^\/images\/(.+)-1400\.webp$/)?.[1]
  if (hero) {
    html = html.replace('</head>', `  <link rel="preload" as="image" href="/images/${hero}-1400.webp" imagesrcset="/images/${hero}-800.webp 800w, /images/${hero}-1400.webp 1400w" imagesizes="100vw" fetchpriority="high" />\n  </head>`)
  }
  const dir = path === '/' ? 'dist' : `dist${path}`
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/index.html`, html)
}
console.log(`prerender-meta: wrote ${Object.keys(pageMeta).length} routes`)
