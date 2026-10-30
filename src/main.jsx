import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.jsx'
import { initSmoothScroll } from './lib/motion'

initSmoothScroll()
// Build-time meta (see scripts/prerender-meta.js) gives way to the tags each page renders.
document.querySelectorAll('head [data-static]').forEach((el) => el.remove())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
