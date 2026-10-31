import { lazy } from 'react'

// After a deploy, a tab opened earlier may ask for page code that no longer exists. Reloading picks up
// the new version. The timestamp guard stops a reload loop if the failure is something else (e.g. offline).
const KEY = 'ttt_chunk_reload'
export function reloadForNewVersion() {
  let last = 0
  try { last = Number(sessionStorage.getItem(KEY)) || 0 } catch { /* storage blocked */ }
  if (Date.now() - last < 30000) return false
  try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* storage blocked */ }
  window.location.reload()
  return true
}

/** React.lazy that reloads once when the page's code can't be fetched. */
export const lazyPage = (load) => lazy(() => load().catch((err) => {
  if (reloadForNewVersion()) return new Promise(() => {}) // keep showing the loader while the page reloads
  throw err
}))
