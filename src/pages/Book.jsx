import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Pencil, Plane, TrainFront, Timer, Route, Repeat, Building2, Phone } from 'lucide-react'
import Seo from '../components/Seo'
import LocationInput from '../components/LocationInput'
import { Page, Picture } from '../components/ui'
import { Field, SubmitButton, SubmitResult, isEmail, isPhone, useSubmit } from '../components/forms'
import { MAX_ADVANCE_DAYS, lastBookableDate, nowTime, today } from '../lib/time'
import { submitBooking } from '../lib/api'
import { company, fleet, tripTypes, vehicleOptions } from '../data/site'
import { EASE, getLenis } from '../lib/motion'
import { useAuth } from '../lib/auth'
import { RequireCustomer } from './AuthPages'

const tripIcons = [Plane, TrainFront, Timer, Route, Repeat, Building2]
const tripHints = ['To or from the airport', 'Station pick-up or drop', 'Car with driver, by the hour', 'Drop at another city', 'Go and come back', 'Something else? Tell us']
const STEPS = ['Trip type', 'Route', 'Date & time', 'Vehicle', 'Passenger', 'Review']

/** Booking requires a signed-in customer: visitors are sent to /login and brought back with their trip details. */
export default function Book() {
  return (
    <RequireCustomer>
      <BookFlow />
    </RequireCustomer>
  )
}

function BookFlow() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const initial = {
    trip: tripTypes.includes(params.get('trip')) ? params.get('trip') : '',
    pickup: params.get('pickup') || '', drop: params.get('drop') || '',
    date: params.get('date') || '', time: params.get('time') || '', returnDate: '',
    vehicle: vehicleOptions.includes(params.get('vehicle')) ? params.get('vehicle') : '',
    passengers: '1', name: user?.name || '', phone: user?.phone || '', email: user?.email || '', notes: '',
  }
  const [f, setF] = useState(initial)
  // The session may finish loading after this page mounts; fill contact details then, without overwriting edits.
  useEffect(() => {
    if (user) setF((s) => ({ ...s, name: s.name || user.name, phone: s.phone || user.phone || '', email: s.email || user.email }))
  }, [user])
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [errors, setErrors] = useState({})
  const [state, run, reset] = useSubmit(submitBooking)
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v?.target ? v.target.value : v }))
  const roundTrip = f.trip === 'Outstation round trip'

  const validate = (i) => {
    const e = {}
    if (i === 0 && !f.trip) e.trip = 'Choose a trip type to continue'
    if (i === 1) {
      if (!f.pickup.trim()) e.pickup = 'Enter a pickup location'
      if (f.trip !== 'Hourly rental' && !f.drop.trim()) e.drop = 'Enter a destination'
    }
    if (i === 2) {
      if (!f.date) e.date = 'Choose a pickup date'
      else if (f.date < today()) e.date = 'Pickup date cannot be in the past'
      else if (f.date > lastBookableDate()) e.date = `You can book up to ${MAX_ADVANCE_DAYS} days ahead. Call us for later trips.`
      if (!f.time) e.time = 'Choose a pickup time'
      else if (f.date === today() && f.time <= nowTime()) e.time = 'That time has already passed. Choose a later pickup time'
      if (roundTrip && f.returnDate && f.returnDate < f.date) e.returnDate = 'Return must be on or after the pickup date'
    }
    if (i === 3 && !f.vehicle) e.vehicle = 'Choose a vehicle, or pick "No preference"'
    if (i === 4) {
      if (!f.name.trim()) e.name = 'Enter your full name'
      if (!isPhone(f.phone)) e.phone = 'Enter a 10-digit mobile number'
      if (f.email && !isEmail(f.email)) e.email = 'Enter a valid email or leave it blank'
    }
    setErrors(e)
    return !Object.keys(e).length
  }

  const goTo = (i, keepErrors = false) => {
    setDir(i > step ? 1 : -1)
    setStep(i)
    if (!keepErrors) setErrors({})
    const top = document.getElementById('booking')
    if (!top) return
    const l = getLenis()
    if (l) l.scrollTo(top, { offset: -90 })
    else top.scrollIntoView()
  }
  const next = () => validate(step) && goTo(step + 1)
  const onSubmit = (e) => {
    e.preventDefault()
    if (step < STEPS.length - 1) return next()
    for (let i = 0; i < STEPS.length - 1; i++) if (!validate(i)) return goTo(i, true)
    run({ ...f, submittedAt: new Date().toISOString() })
  }

  const summary = {
    'Trip type': f.trip, Pickup: f.pickup, Destination: f.drop,
    Date: f.date, Time: f.time, 'Return date': roundTrip ? f.returnDate : '',
    Vehicle: f.vehicle, Passengers: f.passengers, Name: f.name, Phone: f.phone, Email: f.email, Notes: f.notes,
  }
  const done = state.status !== 'idle' && state.status !== 'sending'

  return (
    <Page>
      <Seo path="/book" />

      <section className="relative isolate overflow-hidden bg-midnight pb-40 pt-36 text-white">
        <img src="/images/hero-1200.webp" alt="" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-midnight/60 to-midnight" />
        <div className="wrap">
          <m.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE }} className="display">Book your ride.</m.h1>
          <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1 }} className="lede mt-5 text-white/70">
            Six short steps. Our team then confirms your fare and driver by phone.
          </m.p>
        </div>
      </section>

      <section id="booking" className="relative -mt-28 pb-24 sm:pb-32">
        <div className="wrap grid gap-8 lg:grid-cols-[17rem_1fr]">
          <Stepper step={done ? STEPS.length : step} onJump={(i) => i < step && goTo(i)} />

          <div className="min-w-0 rounded-[1.75rem] bg-white p-5 shadow-[0_40px_100px_-40px_rgb(7_20_38/0.45)] ring-1 ring-line sm:p-10">
            {done ? (
              <SubmitResult bare state={state} title="New booking request" summary={summary} onReset={reset}
                sentText="Your booking request is with our team. We'll call you shortly to confirm the fare and driver details.">
                <p className="mt-5 text-sm text-slate">
                  Follow its status in <Link to={`/my-account/bookings/${state.reference}`} className="font-semibold text-electric">your account</Link>.
                </p>
              </SubmitResult>
            ) : (
              <form onSubmit={onSubmit} noValidate>
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate">Step {step + 1} of {STEPS.length}</p>
                    <h2 className="mt-1 text-[clamp(1.6rem,3vw,2.2rem)] font-semibold">{STEPS[step]}</h2>
                  </div>
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-mist" aria-hidden="true">
                    <m.div className="h-full rounded-full bg-gold" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.6, ease: EASE }} />
                  </div>
                </div>

                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <m.div key={step} custom={dir}
                    variants={{ enter: (d) => ({ opacity: 0, x: d * 40 }), center: { opacity: 1, x: 0 }, exit: (d) => ({ opacity: 0, x: d * -40 }) }}
                    initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease: EASE }}>
                    {step === 0 && (
                      <fieldset>
                        <legend className="sr-only">Trip type</legend>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {tripTypes.map((t, i) => {
                            const Icon = tripIcons[i]
                            return (
                              <Choice key={t} name="trip" value={t} checked={f.trip === t} onChange={() => set('trip')(t)}>
                                <Icon className="h-5 w-5" />
                                <span className="mt-4 block font-semibold">{t}</span>
                                <span className="mt-1 block text-sm opacity-70">{tripHints[i]}</span>
                              </Choice>
                            )
                          })}
                        </div>
                        {errors.trip && <p className="field-error" role="alert">{errors.trip}</p>}
                      </fieldset>
                    )}

                    {step === 1 && (
                      <div className="grid grid-cols-[20px_1fr] gap-x-4">
                        <div className="row-span-2 flex flex-col items-center pb-10 pt-11" aria-hidden="true">
                          <span className="h-3 w-3 rounded-full bg-gold ring-4 ring-gold/20" />
                          <span className="my-1 w-px flex-1 bg-[repeating-linear-gradient(to_bottom,var(--color-gold)_0_4px,transparent_4px_9px)]" />
                          <span className="h-3 w-3 rounded-full border-2 border-navy" />
                        </div>
                        <Field label="Pickup location" error={errors.pickup} className="pb-5" hint="Start typing a city, or use your current location">
                          <LocationInput locate value={f.pickup} onChange={set('pickup')} placeholder="Address, airport or station" invalid={!!errors.pickup} />
                        </Field>
                        <Field label={f.trip === 'Hourly rental' ? 'Destination (optional)' : 'Destination'} error={errors.drop}>
                          <LocationInput value={f.drop} onChange={set('drop')} placeholder="Where are you going?" invalid={!!errors.drop} />
                        </Field>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Pickup date" error={errors.date}><input type="date" min={today()} max={lastBookableDate()} className="input" value={f.date} onChange={set('date')} aria-invalid={!!errors.date} /></Field>
                        <Field label="Pickup time" error={errors.time}><input type="time" className="input" value={f.time} onChange={set('time')} aria-invalid={!!errors.time} /></Field>
                        {roundTrip && (
                          <Field label="Return date (optional)" error={errors.returnDate}><input type="date" min={f.date || today()} className="input" value={f.returnDate} onChange={set('returnDate')} /></Field>
                        )}
                        <Field label="Passengers">
                          <select className="input" value={f.passengers} onChange={set('passengers')}>
                            {['1', '2', '3', '4', '5', '6', '7', '8+'].map((n) => <option key={n}>{n}</option>)}
                          </select>
                        </Field>
                      </div>
                    )}

                    {step === 3 && (
                      <fieldset>
                        <legend className="sr-only">Vehicle</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {fleet.map((v) => (
                            <Choice key={v.name} name="vehicle" value={v.name} checked={f.vehicle === v.name} onChange={() => set('vehicle')(v.name)} flush>
                              <span className="block aspect-[16/8] overflow-hidden">
                                <Picture name={v.image} alt="" sizes="(min-width: 640px) 25vw, 90vw" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                              </span>
                              <span className="block p-4">
                                <span className="block font-semibold">{v.name}</span>
                                {v.models && <span className="mt-0.5 block text-xs font-semibold text-gold-dark">{v.models}</span>}
                                <span className="mt-1 block text-sm opacity-70">{v.use}</span>
                              </span>
                            </Choice>
                          ))}
                          <Choice name="vehicle" value="No preference" checked={f.vehicle === 'No preference'} onChange={() => set('vehicle')('No preference')} className="sm:col-span-2">
                            <span className="block font-semibold">No preference</span>
                            <span className="mt-1 block text-sm opacity-70">We'll suggest the best fit for your group and luggage.</span>
                          </Choice>
                        </div>
                        {errors.vehicle && <p className="field-error" role="alert">{errors.vehicle}</p>}
                      </fieldset>
                    )}

                    {step === 4 && (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <p className="rounded-xl bg-mist p-4 text-sm text-slate sm:col-span-2">
                          Filled in from your profile. Change them only if you're booking for someone else.
                        </p>
                        <Field label="Passenger name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} /></Field>
                        <Field label="Passenger mobile" error={errors.phone}><input type="tel" inputMode="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={!!errors.phone} /></Field>
                        <Field label="Notes for the driver (optional)" className="sm:col-span-2" hint="Flight or train number, luggage, pickup landmark">
                          <textarea rows={3} className="input resize-y" value={f.notes} onChange={set('notes')} />
                        </Field>
                      </div>
                    )}

                    {step === 5 && (
                      <dl className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                        {[
                          ['Trip type', f.trip, 0], ['Pickup', f.pickup, 1], ['Destination', f.drop || 'Not specified', 1],
                          ['When', `${f.date} at ${f.time}${roundTrip && f.returnDate ? `, returning ${f.returnDate}` : ''}`, 2],
                          ['Passengers', f.passengers, 2], ['Vehicle', f.vehicle, 3],
                          ['Contact', [f.name, f.phone, f.email].filter(Boolean).join(', '), 4], ...(f.notes ? [['Notes', f.notes, 4]] : []),
                        ].map(([k, v, s]) => (
                          <div key={k} className="flex items-start gap-4 p-4 sm:px-6">
                            <dt className="w-28 shrink-0 text-sm text-slate">{k}</dt>
                            <dd className="min-w-0 flex-1 break-words font-medium">{v}</dd>
                            <button type="button" onClick={() => goTo(s)} className="shrink-0 text-electric" aria-label={`Edit ${k}`}><Pencil className="h-4 w-4" /></button>
                          </div>
                        ))}
                      </dl>
                    )}
                  </m.div>
                </AnimatePresence>

                {step === 5 && (
                  <p className="mt-5 text-sm text-slate">Fares are confirmed by our team before your trip. Submitting sends a booking request; it is not confirmed until we call you.</p>
                )}

                <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {step > 0 ? (
                    <button type="button" onClick={() => goTo(step - 1)} className="btn btn-line"><ArrowLeft className="h-4 w-4" /> Back</button>
                  ) : (
                    <a href={company.phoneHref} className="btn btn-line"><Phone className="h-4 w-4" /> Prefer to call?</a>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button type="submit" className="btn btn-navy">Continue <ArrowRight className="h-4 w-4" /></button>
                  ) : (
                    <SubmitButton sending={state.status === 'sending'} className="btn-gold">Submit booking request</SubmitButton>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </Page>
  )
}

function Stepper({ step, onJump }) {
  return (
    <ol className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-3 shadow-[0_30px_80px_-40px_rgb(7_20_38/0.4)] ring-1 ring-line [scrollbar-width:none] lg:sticky lg:top-28 lg:block lg:self-start lg:p-6">
      {[...STEPS, 'Submit'].map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo'
        return (
          <li key={label} className="relative shrink-0 lg:pb-7 lg:last:pb-0">
            {i < STEPS.length && (
              <span className="absolute left-[15px] top-8 hidden h-[calc(100%-2rem)] w-px bg-line lg:block" aria-hidden="true">
                <m.span className="absolute inset-x-0 top-0 bg-gold" initial={false} animate={{ height: i < step ? '100%' : '0%' }} transition={{ duration: 0.6, ease: EASE }} />
              </span>
            )}
            <button type="button" onClick={() => onJump(i)} disabled={state !== 'done'} aria-current={state === 'current' ? 'step' : undefined}
              className="flex items-center gap-3 rounded-full py-1 pr-3 text-left disabled:cursor-default">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-all duration-500 ${
                state === 'done' ? 'bg-gold text-midnight' : state === 'current' ? 'bg-navy text-white ring-4 ring-electric/20' : 'bg-mist text-slate'}`}>
                {state === 'done' ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`whitespace-nowrap text-sm font-medium ${state === 'todo' ? 'text-slate' : 'text-ink'} ${state === 'current' ? '' : 'max-lg:hidden'}`}>{label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Choice({ name, value, checked, onChange, children, flush, className = '' }) {
  return (
    <label className={`group relative block cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-electric ${flush ? '' : 'p-5'} ${
      checked ? 'border-navy bg-navy text-white shadow-[0_20px_40px_-20px_rgb(16_36_61/0.6)]' : 'border-line bg-white hover:-translate-y-0.5 hover:border-navy/40'} ${className}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <AnimatePresence>
        {checked && (
          <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute right-3 top-3 z-10 grid h-6 w-6 place-items-center rounded-full bg-gold text-midnight">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </m.span>
        )}
      </AnimatePresence>
      {children}
    </label>
  )
}
