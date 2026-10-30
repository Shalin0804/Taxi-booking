import { SITE_URL } from '../data/site'
import { fullTitle, pageMeta } from '../data/seo'

// React 19 hoists <title>/<meta>/<link> into <head>. Meta text lives in data/seo.js.
export default function Seo({ path = '/', schema, ...override }) {
  const meta = { image: '/images/hero-1200.webp', ...pageMeta[path], ...override }
  const url = SITE_URL + path
  const title = fullTitle(path, meta.title)
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="TTT Cabs" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={SITE_URL + meta.image} />
      <meta name="twitter:card" content="summary_large_image" />
      {schema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      )}
    </>
  )
}
