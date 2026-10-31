import { Component, useEffect, useState } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'

/**
 * Full-screen loader. If it takes a while (the API sleeps on Render's free plan and needs up to a
 * minute to wake), it says so instead of leaving a blank screen.
 */
export function LoadingScreen({ dark = true }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 4000); return () => clearTimeout(t) }, [])
  return (
    <div className={`grid min-h-screen place-items-center px-6 text-center ${dark ? 'bg-midnight text-white' : 'bg-mist text-ink'}`} role="status" aria-live="polite">
      <div>
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-gold" />
        <p className="mt-4 text-sm opacity-70">{slow ? 'Connecting to our servers. After a quiet spell this can take up to a minute.' : 'Loading…'}</p>
      </div>
    </div>
  )
}

/** Shows a reload prompt instead of a blank page when a screen fails to render. */
export class PageErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) { console.error(err) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center bg-midnight px-6 text-center text-white">
        <div>
          <h1 className="text-3xl font-semibold">This page didn't load.</h1>
          <p className="mt-3 text-white/70">The site may have just been updated. Reloading usually fixes it.</p>
          <button onClick={() => window.location.reload()} className="btn btn-gold mt-8"><RefreshCw className="h-4 w-4" /> Reload page</button>
        </div>
      </div>
    )
  }
}
