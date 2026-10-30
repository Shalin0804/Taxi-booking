import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { CalendarDays, Car, Clock, Inbox, UserRound, Users } from 'lucide-react'
import StatusBadge, { statusLabel } from '../components/StatusBadge'
import { DataTable, PageHeader, date, useApi } from './kit'
import { EASE } from '../lib/motion'
import { ADMIN_BASE as A } from './base'
import { useAdmin } from './adminAuth'

export default function Overview() {
  const { data, error, loading } = useApi('/api/admin/stats')
  const { can } = useAdmin()
  const c = data?.counts
  const kpis = [
    { label: 'Pending bookings', value: c?.pending, icon: Clock, to: `${A}/bookings?status=pending`, accent: true },
    { label: 'Cancellation requests', value: c?.cancel_requests, icon: Clock, to: `${A}/bookings?cancel=1` },
    { label: 'Pickups today', value: c?.today, icon: CalendarDays, to: `${A}/bookings` },
    { label: 'New enquiries', value: c?.new_enquiries, icon: Inbox, to: `${A}/corporate-enquiries` },
    { label: 'Total bookings', value: c?.bookings, icon: CalendarDays, to: `${A}/bookings` },
    { label: 'Customers', value: c?.customers, icon: Users, to: `${A}/customers` },
    { label: 'Active vehicles', value: c?.active_vehicles, icon: Car, to: `${A}/vehicles` },
    { label: 'Available drivers', value: c?.available_drivers, icon: UserRound, to: `${A}/drivers` },
  ]

  return (
    <>
      <PageHeader title="Dashboard" sub="Live figures from the bookings database." />
      {error && <p className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <m.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.5, ease: EASE }}>
            <Link to={k.to} className={`group block rounded-2xl p-5 ring-1 transition-shadow hover:shadow-lg ${k.accent ? 'bg-midnight text-white ring-midnight' : 'bg-white ring-line'}`}>
              <k.icon className={`h-5 w-5 ${k.accent ? 'text-gold' : 'text-navy'}`} />
              <p className="mt-4 text-3xl font-semibold tracking-tight">{loading && !c ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-current opacity-10" /> : k.value}</p>
              <p className={`mt-1 text-sm ${k.accent ? 'text-white/65' : 'text-slate'}`}>{k.label}</p>
            </Link>
          </m.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line sm:p-6">
          <h2 className="font-semibold">Bookings received, last 14 days</h2>
          <DayChart rows={data?.byDay} />
        </section>
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line sm:p-6">
          <h2 className="font-semibold">By status</h2>
          <Bars rows={data?.byStatus?.map((r) => ({ label: statusLabel(r.status), n: r.n }))} />
          <h2 className="mt-8 font-semibold">By trip type</h2>
          <Bars rows={data?.byTrip?.map((r) => ({ label: r.trip_type, n: r.n }))} />
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Latest bookings</h2>
          {can('bookings:read') && <Link to={`${A}/bookings`} className="text-sm font-semibold text-electric">View all</Link>}
        </div>
        <DataTable loading={loading} rows={data?.recent} empty="No bookings yet. They appear here as soon as customers book."
          columns={[
            { key: 'reference', label: 'Reference', className: 'font-medium' },
            { key: 'name', label: 'Customer' },
            { key: 'trip_type', label: 'Trip' },
            { key: 'pickup_date', label: 'Pickup', render: (r) => date(r.pickup_date) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]} />
      </section>
    </>
  )
}

function DayChart({ rows }) {
  // Fill missing days with zero so the axis is continuous.
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10)
    return { d, n: rows?.find((r) => String(r.day).slice(0, 10) === d)?.n || 0 }
  })
  const max = Math.max(1, ...days.map((x) => x.n))
  return (
    <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2" role="img" aria-label={`Bookings per day: ${days.map((x) => `${x.d} ${x.n}`).join(', ')}`}>
      {days.map((x, i) => (
        <div key={x.d} className="group relative flex h-full flex-1 flex-col justify-end">
          <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-midnight px-1.5 py-0.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">{x.n}</span>
          <m.div className="w-full rounded-t-md bg-navy group-hover:bg-electric" initial={{ height: 0 }} animate={{ height: `${(x.n / max) * 100}%` }}
            transition={{ delay: i * 0.03, duration: 0.7, ease: EASE }} style={{ minHeight: x.n ? 4 : 2, opacity: x.n ? 1 : 0.25 }} />
          <span className="mt-2 text-center text-[10px] text-slate">{i % 2 === 1 ? new Date(x.d).getDate() : ''}</span>
        </div>
      ))}
    </div>
  )
}

function Bars({ rows }) {
  if (!rows?.length) return <p className="mt-3 text-sm text-slate">No data yet.</p>
  const max = Math.max(...rows.map((r) => r.n))
  return (
    <ul className="mt-4 grid gap-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-slate">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-mist">
            <m.span className="block h-full rounded-full bg-gold" initial={{ width: 0 }} animate={{ width: `${(r.n / max) * 100}%` }} transition={{ duration: 0.8, ease: EASE }} />
          </span>
          <span className="text-right font-semibold">{r.n}</span>
        </li>
      ))}
    </ul>
  )
}
