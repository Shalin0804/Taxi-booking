import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, Car, LoaderCircle, LogOut, Phone, RefreshCw, UserRound } from 'lucide-react'
import Seo from '../components/Seo'
import StatusBadge from '../components/StatusBadge'
import { Page } from '../components/ui'
import { isStaff, useAuth } from '../lib/auth'
import { request } from '../lib/api'
import { company } from '../data/site'

const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')

export default function Account() {
  const { user, ready, logout } = useAuth()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [busyRef, setBusyRef] = useState('')

  const load = useCallback(() => {
    setError('')
    request('/api/my/bookings').then((d) => setRows(d.rows)).catch((e) => setError(e.message))
  }, [])
  useEffect(() => { if (user) load() }, [user, load])

  if (!ready) return <div className="min-h-screen bg-midnight" />
  if (!user) return <Navigate to="/login?next=/account" replace />

  const cancel = async (ref) => {
    setBusyRef(ref)
    try { await request(`/api/my/bookings/${ref}/cancel`, { method: 'POST' }); load() } catch (e) { setError(e.message) } finally { setBusyRef('') }
  }

  return (
    <Page>
      <Seo path="/account" />
      <meta name="robots" content="noindex" />
      <section className="bg-midnight pb-28 pt-36 text-white">
        <div className="wrap flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-white/60">Signed in as {user.email}</p>
            <h1 className="mt-2 text-[clamp(2.4rem,5vw,4rem)]">Hello, {user.name.split(' ')[0]}.</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            {isStaff(user) && <Link to="/admin" className="btn btn-ghost">Open admin</Link>}
            <Link to="/book" className="btn btn-gold">Book a ride <ArrowRight className="h-4 w-4" /></Link>
            <button onClick={logout} className="btn btn-ghost"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      </section>

      <section className="-mt-16 pb-24">
        <div className="wrap">
          <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_40px_100px_-40px_rgb(7_20_38/0.45)] ring-1 ring-line sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your bookings</h2>
              <button onClick={load} className="flex items-center gap-2 text-sm font-semibold text-electric"><RefreshCw className="h-4 w-4" /> Refresh</button>
            </div>
            {error && <p className="mb-4 rounded-xl bg-red-50 p-3.5 text-sm text-red-700" role="alert">{error}</p>}
            {rows === null && !error && <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-mist" />)}</div>}
            {rows?.length === 0 && (
              <div className="rounded-2xl bg-mist p-10 text-center">
                <p className="text-lg font-semibold">No bookings yet</p>
                <p className="mt-1 text-slate">Bookings you make while signed in appear here with live status.</p>
                <Link to="/book" className="btn btn-navy mt-6">Book your first ride</Link>
              </div>
            )}
            <ul className="grid gap-3">
              {rows?.map((b) => (
                <li key={b.reference} className="rounded-2xl border border-line p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={b.status} />
                      <span className="text-sm text-slate">{b.reference}</span>
                    </div>
                    <span className="text-sm text-slate">{b.trip_type}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold">{b.pickup}{b.dropoff ? ` to ${b.dropoff}` : ''}</p>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-slate">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {fmtDate(b.pickup_date)}, {b.pickup_time?.slice(0, 5)}</span>
                    {b.vehicle_pref && <span className="flex items-center gap-1.5"><Car className="h-4 w-4" /> {b.vehicle_pref}</span>}
                    {b.fare !== null && <span>Fare: ₹{Number(b.fare).toLocaleString('en-IN')}</span>}
                  </div>
                  {b.driver_name && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-mist p-4 text-sm">
                      <span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-navy" /> {b.driver_name}</span>
                      {b.driver_phone && <a href={`tel:${b.driver_phone}`} className="flex items-center gap-2 font-semibold text-electric"><Phone className="h-4 w-4" /> {b.driver_phone}</a>}
                      {b.vehicle_model && <span className="flex items-center gap-2"><Car className="h-4 w-4 text-navy" /> {b.vehicle_model} · {b.registration}</span>}
                    </div>
                  )}
                  {['pending', 'confirmed'].includes(b.status) && (
                    <button onClick={() => cancel(b.reference)} disabled={busyRef === b.reference} className="mt-4 text-sm font-semibold text-red-600 disabled:opacity-50">
                      {busyRef === b.reference ? <LoaderCircle className="inline h-4 w-4 animate-spin" /> : 'Cancel booking'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-slate">Need to change a trip? Call <a href={company.phoneHref} className="font-semibold text-ink">{company.phoneDisplay}</a>.</p>
          </div>
        </div>
      </section>
    </Page>
  )
}
