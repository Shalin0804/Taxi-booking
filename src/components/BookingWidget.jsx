import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { m } from 'framer-motion'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import LocationInput from './LocationInput'
import { tripTypes, vehicleOptions } from '../data/site'
import { EASE } from '../lib/motion'
import { useAuth } from '../lib/auth'

import { lastBookableDate, today } from '../lib/time'

const card = 'rounded-[1.75rem] border border-white/12 bg-midnight/55 p-5 text-white shadow-[0_40px_120px_-30px_rgb(0_0_0/0.7)] backdrop-blur-2xl sm:p-7'
// Where visitors return after signing in or registering.
const RETURN_TO = encodeURIComponent('/#plan-your-ride')

/**
 * Plan your ride. Visitors see a locked card with no booking fields; signed-in customers get the form,
 * which hands off to /book. The API also rejects bookings without a customer session.
 */
export default function BookingWidget({ className = '' }) {
  const { user, ready } = useAuth()
  if (!ready) return <div id="plan-your-ride" className={`${card} min-h-[22rem] animate-pulse ${className}`} aria-hidden="true" />
  return user ? <PlanForm className={className} /> : <Locked className={className} />
}

function Locked({ className }) {
  return (
    <section id="plan-your-ride" aria-labelledby="plan-locked-h" className={`${card} scroll-mt-28 ${className}`}>
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/40"><LockKeyhole className="h-5 w-5" /></span>
        {/* The route motif, at rest until the customer signs in. */}
        <span className="flex flex-1 items-center gap-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-gold" />
          <span className="h-px flex-1 bg-[repeating-linear-gradient(to_right,rgb(200_169_107/0.6)_0_5px,transparent_5px_10px)]" />
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white/50" />
        </span>
      </div>
      <h2 id="plan-locked-h" className="mt-7 text-[1.9rem] font-semibold leading-tight tracking-tight">Ready to Plan Your Journey?</h2>
      <p className="mt-3 text-white/70">Login to your TTT Cabs account to access our ride booking experience.</p>
      <ul className="mt-6 grid gap-2 text-sm text-white/60">
        <li>Pickup, destination, date and time in one step</li>
        <li>Your choice of sedan, SUV, luxury or group vehicle</li>
        <li>Live booking status and driver details in your account</li>
      </ul>
      <div className="mt-7 grid gap-3">
        <Link to={`/login?next=${RETURN_TO}`} className="btn btn-gold w-full">Login to Continue <ArrowRight className="h-4 w-4" /></Link>
        <Link to={`/register?next=${RETURN_TO}`} className="btn btn-ghost w-full">Create Account</Link>
      </div>
    </section>
  )
}

function PlanForm({ className }) {
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
    <form id="plan-your-ride" onSubmit={submit} noValidate aria-label="Plan your ride" className={`${card} scroll-mt-28 ${className}`}>
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
        <Field label="Pickup date"><input type="date" min={today()} max={lastBookableDate()} value={f.date} onChange={set('date')} className="input-dark" /></Field>
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
