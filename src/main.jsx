import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.jsx'
import { initSmoothScroll } from './lib/motion'
import { reloadForNewVersion } from './lib/lazy'

// A tab opened before a deploy can request code that no longer exists: reload to get the new version.
window.addEventListener('vite:preloadError', (e) => { if (reloadForNewVersion()) e.preventDefault() })

initSmoothScroll()
// Build-time meta (see scripts/prerender-meta.js) gives way to the tags each page renders.
document.querySelectorAll('head [data-static]').forEach((el) => el.remove())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
