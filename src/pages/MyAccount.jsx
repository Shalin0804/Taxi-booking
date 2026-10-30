import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Car, LoaderCircle, LogOut, Phone, RefreshCw, UserRound } from 'lucide-react'
import Seo from '../components/Seo'
import StatusBadge from '../components/StatusBadge'
import { Page } from '../components/ui'
import { Field, isPhone } from '../components/forms'
import { FormError, PasswordInput, RequireCustomer } from './AuthPages'
import { useAuth } from '../lib/auth'
import { request } from '../lib/api'
import { company } from '../data/site'

const fmtDate = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`
const isUpcoming = (b) => !['completed', 'cancelled'].includes(b.status)

const tabs = [
  ['/my-account', 'Overview', true], ['/my-account/bookings', 'Bookings'], ['/my-account/payment-history', 'Payment history'], ['/my-account/profile', 'Profile'],
]

export default function MyAccount() {
  return (
    <RequireCustomer>
      <Shell />
    </RequireCustomer>
  )
}

function Shell() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  return (
    <Page>
      <Seo path="/my-account" />
      <meta name="robots" content="noindex" />
      <section className="bg-midnight pb-24 pt-36 text-white">
        <div className="wrap flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-white/60">{user.email}</p>
            <h1 className="mt-2 text-[clamp(2.4rem,5vw,4rem)]">Hello, {user.name.split(' ')[0]}.</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/book" className="btn btn-gold">Book a ride <ArrowRight className="h-4 w-4" /></Link>
            <button onClick={async () => { await logout(); nav('/', { replace: true }) }} className="btn btn-ghost"><LogOut className="h-4 w-4" /> Sign out</button>
          </div>
        </div>
      </section>
      <section className="-mt-12 pb-24">
        <div className="wrap">
          <nav aria-label="My account" className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-white p-1.5 shadow-lg ring-1 ring-line [scrollbar-width:none]">
            {tabs.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => `whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-midnight text-white' : 'text-slate hover:text-ink'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="rounded-[1.75rem] bg-white p-5 shadow-[0_40px_100px_-40px_rgb(7_20_38/0.45)] ring-1 ring-line sm:p-8">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="bookings" element={<BookingList />} />
              <Route path="bookings/:ref" element={<BookingDetail />} />
              <Route path="payment-history" element={<Payments />} />
              <Route path="profile" element={<Profile />} />
              <Route path="*" element={<p className="text-slate">This page doesn't exist. <Link to="/my-account" className="font-semibold text-electric">Go to your account</Link></p>} />
            </Routes>
          </div>
          <p className="mt-6 text-sm text-slate">Need to change a trip? Call <a href={company.phoneHref} className="font-semibold text-ink">{company.phoneDisplay}</a>.</p>
        </div>
      </section>
    </Page>
  )
}

function useBookings() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => {
    setError('')
    request('/api/bookings').then((d) => setRows(d.rows)).catch((e) => setError(e.message))
  }, [])
  useEffect(load, [load])
  return { rows, error, load }
}

function Skeleton() {
  return <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-mist" />)}</div>
}

function BookingCard({ b }) {
  return (
    <Link to={`/my-account/bookings/${b.reference}`} className="block rounded-2xl border border-line p-5 transition-colors hover:border-navy/40 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={b.status} />
          {b.cancel_requested_at && b.status !== 'cancelled' && <span className="text-xs font-semibold text-red-600">Cancellation requested</span>}
        </div>
        <span className="text-sm text-slate">{b.reference}</span>
      </div>
      <p className="mt-3 text-lg font-semibold">{b.pickup}{b.dropoff ? ` to ${b.dropoff}` : ''}</p>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-slate">
        <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {fmtDate(b.pickup_date)}, {b.pickup_time?.slice(0, 5)}</span>
        <span>{b.trip_type}</span>
        {b.driver_name && <span className="flex items-center gap-1.5"><UserRound className="h-4 w-4" /> {b.driver_name}</span>}
      </div>
    </Link>
  )
}

function Overview() {
  const { rows, error } = useBookings()
  const upcoming = rows?.filter(isUpcoming) ?? []
  return (
    <>
      <h2 className="text-2xl font-semibold">Upcoming trips</h2>
      <div className="mt-5">
        {error && <FormError message={error} />}
        {!rows && !error && <Skeleton />}
        {rows && !upcoming.length && (
          <div className="rounded-2xl bg-mist p-10 text-center">
            <p className="text-lg font-semibold">No upcoming trips</p>
            <p className="mt-1 text-slate">Book a ride and it appears here with live status.</p>
            <Link to="/book" className="btn btn-navy mt-6">Plan your ride</Link>
          </div>
        )}
        <ul className="grid gap-3">{upcoming.map((b) => <li key={b.reference}><BookingCard b={b} /></li>)}</ul>
      </div>
      {rows?.length > upcoming.length && <Link to="/my-account/bookings" className="mt-6 inline-block text-sm font-semibold text-electric">See all bookings</Link>}
    </>
  )
}

function BookingList() {
  const { rows, error, load } = useBookings()
  const [filter, setFilter] = useState('all')
  const shown = rows?.filter((b) => filter === 'all' || (filter === 'upcoming' ? isUpcoming(b) : !isUpcoming(b)))
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Your bookings</h2>
        <div className="flex items-center gap-2">
          <select aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value)} className="input !w-auto !py-2">
            <option value="all">All</option><option value="upcoming">Upcoming</option><option value="past">Past and cancelled</option>
          </select>
          <button onClick={load} className="grid h-10 w-10 place-items-center rounded-full text-electric hover:bg-mist" aria-label="Refresh"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </div>
      {error && <FormError message={error} />}
      {!rows && !error && <Skeleton />}
      {shown?.length === 0 && <p className="rounded-2xl bg-mist p-8 text-center text-slate">No bookings here.</p>}
      <ul className="grid gap-3">{shown?.map((b) => <li key={b.reference}><BookingCard b={b} /></li>)}</ul>
    </>
  )
}

function BookingDetail() {
  const { ref } = useParams()
  const [b, setB] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const load = useCallback(() => {
    request(`/api/bookings/${encodeURIComponent(ref)}`).then((d) => setB(d.row)).catch((e) => setError(e.message))
  }, [ref])
  useEffect(load, [load])

  const cancel = async () => {
    setBusy(true)
    try {
      const r = await request(`/api/bookings/${encodeURIComponent(ref)}/cancel`, { method: 'PATCH' })
      setNote(r.outcome === 'cancelled' ? 'Your booking is cancelled.' : "We've sent your cancellation request to our team. We'll call you to confirm.")
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (error) return <><FormError message={error} /><Link to="/my-account/bookings" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-electric"><ArrowLeft className="h-4 w-4" /> All bookings</Link></>
  if (!b) return <Skeleton />
  const canCancel = ['pending', 'confirmed'].includes(b.status) || (b.status === 'assigned' && !b.cancel_requested_at)
  const rows = [
    ['Trip', b.trip_type], ['Pickup', b.pickup], ['Destination', b.dropoff || 'Not specified'],
    ['When', `${fmtDate(b.pickup_date)}, ${b.pickup_time?.slice(0, 5)}${b.return_date ? `, returning ${fmtDate(b.return_date)}` : ''}`],
    ['Vehicle', b.vehicle_pref || 'No preference'], ['Passengers', b.passengers || '—'],
    ['Passenger contact', `${b.name}, ${b.phone}`], ['Notes', b.notes || '—'],
    ['Fare', b.fare !== null ? inr(b.fare) : 'Our team confirms the fare by phone'],
  ]
  return (
    <>
      <Link to="/my-account/bookings" className="inline-flex items-center gap-2 text-sm font-semibold text-electric"><ArrowLeft className="h-4 w-4" /> All bookings</Link>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">Booking {b.reference}</h2>
        <StatusBadge status={b.status} />
      </div>
      {note && <p className="mt-4 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800" role="status">{note}</p>}
      {b.cancel_requested_at && b.status !== 'cancelled' && !note && <p className="mt-4 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900">You've asked to cancel this trip. Our team will call you to confirm.</p>}
      {b.driver_name && (
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-mist p-5 text-sm">
          <span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-navy" /> {b.driver_name}</span>
          {b.driver_phone && <a href={`tel:${b.driver_phone}`} className="flex items-center gap-2 font-semibold text-electric"><Phone className="h-4 w-4" /> {b.driver_phone}</a>}
          {b.vehicle_model && <span className="flex items-center gap-2"><Car className="h-4 w-4 text-navy" /> {b.vehicle_model} · {b.registration}</span>}
        </div>
      )}
      <dl className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 p-4 sm:grid-cols-[11rem_1fr] sm:px-6"><dt className="text-sm text-slate">{k}</dt><dd className="break-words font-medium">{v}</dd></div>
        ))}
      </dl>
      {canCancel && (
        <button onClick={cancel} disabled={busy} className="btn btn-line mt-6 !border-red-200 !text-red-600 hover:!text-white">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : b.status === 'assigned' ? 'Request cancellation' : 'Cancel booking'}
        </button>
      )}
    </>
  )
}

function Payments() {
  const { rows, error } = useBookings()
  const paid = rows?.filter((b) => b.status === 'completed' && b.fare !== null) ?? []
  return (
    <>
      <h2 className="text-2xl font-semibold">Payment history</h2>
      <p className="mt-1 text-sm text-slate">Fares for your completed trips. Online payment isn't available yet.</p>
      <div className="mt-5">
        {error && <FormError message={error} />}
        {!rows && !error && <Skeleton />}
        {rows && !paid.length && <p className="rounded-2xl bg-mist p-8 text-center text-slate">No completed trips with a fare yet.</p>}
        {paid.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {paid.map((b) => (
              <li key={b.reference} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
                <div>
                  <Link to={`/my-account/bookings/${b.reference}`} className="font-semibold hover:text-electric">{b.pickup}{b.dropoff ? ` to ${b.dropoff}` : ''}</Link>
                  <p className="text-sm text-slate">{fmtDate(b.pickup_date)} · {b.reference}</p>
                </div>
                <span className="text-lg font-semibold">{inr(b.fare)}</span>
              </li>
            ))}
            <li className="flex justify-between bg-mist p-4 font-semibold sm:px-6"><span>Total</span><span>{inr(paid.reduce((s, b) => s + Number(b.fare), 0))}</span></li>
          </ul>
        )}
      </div>
    </>
  )
}

function Profile() {
  const { user, setUser } = useAuth()
  const [f, setF] = useState({ name: user.name, phone: user.phone || '' })
  const [p, setP] = useState({ currentPassword: '', newPassword: '' })
  const [msg, setMsg] = useState({})
  const [busy, setBusy] = useState('')

  const saveProfile = async (e) => {
    e.preventDefault()
    if (f.name.trim().length < 2 || !isPhone(f.phone)) return setMsg({ profileError: 'Enter your full name and a 10-digit mobile number.' })
    setBusy('profile')
    try {
      const d = await request('/api/me', { method: 'PATCH', body: f })
      setUser(d.user)
      setMsg({ profile: 'Profile saved.' })
    } catch (ex) { setMsg({ profileError: ex.message }) } finally { setBusy('') }
  }
  const savePassword = async (e) => {
    e.preventDefault()
    if (p.newPassword.length < 8) return setMsg({ passwordError: 'Use at least 8 characters for the new password.' })
    setBusy('password')
    try {
      await request('/api/me/password', { method: 'POST', body: p })
      setP({ currentPassword: '', newPassword: '' })
      setMsg({ password: 'Password changed. Other devices have been signed out.' })
    } catch (ex) { setMsg({ passwordError: ex.message }) } finally { setBusy('') }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={saveProfile} noValidate className="grid content-start gap-5">
        <h2 className="text-2xl font-semibold">Profile</h2>
        <FormError message={msg.profileError} />
        {msg.profile && <p className="rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800" role="status">{msg.profile}</p>}
        <Field label="Full name"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
        <Field label="Mobile number"><input type="tel" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></Field>
        <Field label="Email" hint="To change your email, call us."><input className="input bg-mist" value={user.email} readOnly /></Field>
        <button disabled={busy === 'profile'} className="btn btn-navy justify-self-start">{busy === 'profile' ? 'Saving…' : 'Save profile'}</button>
      </form>
      <form onSubmit={savePassword} noValidate className="grid content-start gap-5">
        <h2 className="text-2xl font-semibold">Password</h2>
        <FormError message={msg.passwordError} />
        {msg.password && <p className="rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800" role="status">{msg.password}</p>}
        <Field label="Current password"><PasswordInput value={p.currentPassword} onChange={(e) => setP({ ...p, currentPassword: e.target.value })} autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 8 characters"><PasswordInput value={p.newPassword} onChange={(e) => setP({ ...p, newPassword: e.target.value })} autoComplete="new-password" /></Field>
        <button disabled={busy === 'password'} className="btn btn-line justify-self-start">{busy === 'password' ? 'Saving…' : 'Change password'}</button>
      </form>
    </div>
  )
}
