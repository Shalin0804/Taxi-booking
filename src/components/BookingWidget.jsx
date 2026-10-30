import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import LocationInput from './LocationInput'
import { tripTypes, vehicleOptions } from '../data/site'
import { EASE } from '../lib/motion'

export const today = () => new Date().toISOString().slice(0, 10)

/** Quick-start booking from the hero. Hands everything to /book, which finishes the flow. */
export default function BookingWidget({ className = '' }) {
  const nav = useNavigate()
  const [f, setF] = useState({ pickup: '', drop: '', date: '', time: '', trip: tripTypes[0], vehicle: 'No preference' })
  const [errors, setErrors] = useState({})
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: typeof v === 'string' ? v : v.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!f.pickup.trim()) err.pickup = 'Add a pickup location'
    if (!f.drop.trim()) err.drop = 'Add a destination'
    setErrors(err)
    if (Object.keys(err).length) return
    nav(`/book?${new URLSearchParams(f)}`)
  }

  const routed = f.pickup && f.drop
  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Quick booking"
      className={`rounded-[1.75rem] border border-white/12 bg-midnight/55 p-5 text-white shadow-[0_40px_120px_-30px_rgb(0_0_0/0.7)] backdrop-blur-2xl sm:p-7 ${className}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Plan your ride</h2>
        <span className="text-xs text-white/50">Takes under a minute</span>
      </div>

      {/* Route: pickup and destination joined by the gold line that runs through the brand. */}
      <div className="grid grid-cols-[18px_1fr] gap-x-3">
        <div className="relative row-span-2 flex flex-col items-center pt-[1.15rem] pb-[1.15rem]" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-gold ring-4 ring-gold/20" />
          <span className="relative my-1 w-px flex-1 overflow-hidden bg-white/15">
            <m.span className="absolute inset-x-0 top-0 bg-gold" initial={false}
              animate={{ height: routed ? '100%' : '0%' }} transition={{ duration: 0.9, ease: EASE }} />
          </span>
          <span className={`h-2.5 w-2.5 rounded-full border-2 transition-colors duration-500 ${routed ? 'border-gold bg-gold' : 'border-white/50'}`} />
        </div>
        <div className="pb-3">
          <label htmlFor="w-pickup" className="sr-only">Pickup location</label>
          <LocationInput id="w-pickup" dark locate value={f.pickup} onChange={set('pickup')} placeholder="Pickup location" invalid={!!errors.pickup} />
          {errors.pickup && <p className="mt-1 text-xs text-red-300">{errors.pickup}</p>}
        </div>
        <div>
          <label htmlFor="w-drop" className="sr-only">Destination</label>
          <LocationInput id="w-drop" dark value={f.drop} onChange={set('drop')} placeholder="Destination" invalid={!!errors.drop} />
          {errors.drop && <p className="mt-1 text-xs text-red-300">{errors.drop}</p>}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Pickup date"><input type="date" min={today()} value={f.date} onChange={set('date')} className="input-dark" /></Field>
        <Field label="Pickup time"><input type="time" value={f.time} onChange={set('time')} className="input-dark" /></Field>
        <Field label="Trip type" wide>
          <select value={f.trip} onChange={set('trip')} className="input-dark">{tripTypes.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Vehicle" wide>
          <select value={f.vehicle} onChange={set('vehicle')} className="input-dark">{vehicleOptions.map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
      </div>

      <button type="submit" className="btn btn-gold mt-5 w-full">Continue booking <ArrowRight className="h-4 w-4" /></button>
    </form>
  )
}

function Field({ label, children, wide }) {
  // Selects span the full row on narrow phones so their text isn't clipped.
  return (
    <label className={`block ${wide ? 'max-[420px]:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs font-medium text-white/55">{label}</span>
      {children}
    </label>
  )
}
