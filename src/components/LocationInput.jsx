import { useId, useState } from 'react'
import { LocateFixed, LoaderCircle } from 'lucide-react'
import { cities } from '../data/site'

/** Text input with city suggestions and an optional "use my location" helper. */
export default function LocationInput({ value, onChange, placeholder, dark, locate, invalid, id, ...rest }) {
  const listId = useId()
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')

  const useMyLocation = () => {
    if (!navigator.geolocation) return setHint('Location is not available in this browser.')
    setBusy(true)
    setHint('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setBusy(false)
        onChange(`Current location (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`)
      },
      () => { setBusy(false); setHint('Location permission was denied. Type your pickup address instead.') },
      { timeout: 10000 },
    )
  }

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          list={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="street-address"
          aria-invalid={invalid || undefined}
          className={`${dark ? 'input-dark' : 'input'} ${locate ? 'pr-12' : ''}`}
          {...rest}
        />
        {locate && (
          <button
            type="button"
            onClick={useMyLocation}
            aria-label="Use my current location"
            title="Use my current location"
            className={`absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg transition-colors ${
              dark ? 'text-gold hover:bg-white/10' : 'text-electric hover:bg-electric/10'}`}
          >
            {busy ? <LoaderCircle className="h-4.5 w-4.5 animate-spin" /> : <LocateFixed className="h-4.5 w-4.5" />}
          </button>
        )}
        <datalist id={listId}>{cities.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      {hint && <p className={`mt-1.5 text-xs ${dark ? 'text-white/60' : 'text-slate'}`} role="status">{hint}</p>}
    </div>
  )
}
