import { useState } from 'react'
import { Download } from 'lucide-react'
import { PageHeader, inr, useApi, useToast } from './kit'
import { statusLabel } from '../components/StatusBadge'
import { download } from '../lib/api'
import { today } from '../lib/time'
import { useAdmin } from './adminAuth'

const PRESETS = {
  booked: [['Today', 0, 0], ['Last 7 days', -6, 0], ['Last 30 days', -29, 0], ['Last 90 days', -89, 0]],
  pickup: [['Today', 0, 0], ['Next 7 days', 0, 6], ['Next 30 days', 0, 29], ['Last 30 days', -29, 0]],
}

export default function Reports() {
  const { can } = useAdmin()
  const toast = useToast()
  const [basis, setBasis] = useState('booked')
  const [range, setRange] = useState({ from: today(-29), to: today() })
  const qs = `basis=${basis}&from=${range.from}&to=${range.to}`
  const { data, error, loading } = useApi(`/api/admin/reports?${qs}`)
  const t = data?.totals

  const switchBasis = (b) => {
    setBasis(b)
    // Pickups are mostly in the future, bookings in the past: start each view on a sensible window.
    setRange(b === 'pickup' ? { from: today(), to: today(29) } : { from: today(-29), to: today() })
  }
  const exportCsv = () => download(`/api/admin/bookings.csv?${qs}`, `tttcabs-${basis}-${range.from}-to-${range.to}.csv`)
    .catch((e) => toast(e.message, 'error'))

  const cards = [
    ['Bookings', t?.bookings], ['Open', t?.open], ['Completed', t?.completed], ['Cancelled', t?.cancelled],
    ['Customers', t?.customers], ['Revenue (completed)', t && inr(t.revenue)], ['Expected (open trips)', t && inr(t.expected)],
  ]

  return (
    <>
      <PageHeader title="Reports" sub="Revenue counts completed trips with a fare. Expected counts open trips that already have a fare.">
        {can('bookings:export') && <button onClick={exportCsv} className="btn btn-line !px-4 !py-2.5"><Download className="h-4 w-4" /> Export to Excel</button>}
      </PageHeader>

      <div className="mb-6 grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-line">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate">Count bookings by</span>
          <div className="flex rounded-full bg-mist p-1" role="tablist" aria-label="Date basis">
            {[['booked', 'Date booked'], ['pickup', 'Pickup date']].map(([v, l]) => (
              <button key={v} role="tab" aria-selected={basis === v} onClick={() => switchBasis(v)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${basis === v ? 'bg-midnight text-white' : 'text-slate hover:text-ink'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="field"><span className="field-label">From</span><input type="date" className="input !py-2.5" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label className="field"><span className="field-label">To</span><input type="date" className="input !py-2.5" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          {PRESETS[basis].map(([l, a, z]) => {
            const active = range.from === today(a) && range.to === today(z)
            return (
              <button key={l} onClick={() => setRange({ from: today(a), to: today(z) })}
                className={`btn !px-4 !py-2.5 text-sm ${active ? 'btn-navy' : 'btn-line'}`}>{l}</button>
            )
          })}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {cards.map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <p className="text-sm text-slate">{l}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{v ?? <span className="inline-block h-7 w-10 animate-pulse rounded bg-mist" />}</p>
          </div>
        ))}
      </div>
      {t && t.bookings === 0 && (
        <p className="mt-4 rounded-xl bg-mist p-4 text-sm text-slate">
          No bookings in this period{basis === 'booked' ? ' by booking date. Try "Pickup date" to see trips coming up.' : '.'}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Breakdown title="By status" rows={data?.byStatus?.map((r) => ({ ...r, label: statusLabel(r.label) }))} />
        <Breakdown title="By trip type" rows={data?.byTrip} money />
        <Breakdown title="By vehicle requested" rows={data?.byVehicle} />
        <Breakdown title="Trips by driver" rows={data?.byDriver} />
      </div>
    </>
  )
}

function Breakdown({ title, rows, money }) {
  const max = Math.max(1, ...(rows || []).map((r) => r.n))
  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <h2 className="font-semibold">{title}</h2>
      {!rows?.length ? <p className="mt-3 text-sm text-slate">No data for this period.</p> : (
        <ul className="mt-4 grid gap-3">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-3"><span className="truncate">{r.label}</span><span className="shrink-0 font-semibold">{r.n}{money && r.revenue ? ` · ${inr(r.revenue)}` : ''}</span></div>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-mist"><span className="block h-full rounded-full bg-gold" style={{ width: `${(r.n / max) * 100}%` }} /></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
