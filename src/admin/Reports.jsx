import { useState } from 'react'
import { Download } from 'lucide-react'
import { PageHeader, inr, useApi, useToast } from './kit'
import { download } from '../lib/api'
import { useAdmin } from './adminAuth'

const iso = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10)

export default function Reports() {
  const { can } = useAdmin()
  const toast = useToast()
  const [range, setRange] = useState({ from: iso(29), to: iso(0) })
  const { data, error, loading } = useApi(`/api/admin/reports?from=${range.from}&to=${range.to}`)
  const t = data?.totals

  const exportCsv = () => download(`/api/admin/bookings.csv?from=${range.from}&to=${range.to}`, `tttcabs-bookings-${range.from}-to-${range.to}.csv`)
    .catch((e) => toast(e.message, 'error'))

  return (
    <>
      <PageHeader title="Reports" sub="Bookings by pickup date. Revenue counts completed trips with a confirmed fare.">
        {can('bookings:export') && <button onClick={exportCsv} className="btn btn-line !px-4 !py-2.5"><Download className="h-4 w-4" /> Export period to Excel</button>}
      </PageHeader>
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
        <label className="field"><span className="field-label">From</span><input type="date" className="input !py-2.5" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
        <label className="field"><span className="field-label">To</span><input type="date" className="input !py-2.5" value={range.to} min={range.from} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
        {[['Last 7 days', 6], ['Last 30 days', 29], ['Last 90 days', 89]].map(([l, n]) => (
          <button key={l} onClick={() => setRange({ from: iso(n), to: iso(0) })} className="btn btn-line !px-4 !py-2.5 text-sm">{l}</button>
        ))}
      </div>
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
      <div className={`grid grid-cols-2 gap-3 lg:grid-cols-5 ${loading ? 'opacity-60' : ''}`}>
        {[['Bookings', t?.bookings], ['Completed', t?.completed], ['Cancelled', t?.cancelled], ['Customers', t?.customers], ['Revenue', t ? inr(t.revenue) : null]].map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <p className="text-sm text-slate">{l}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{v ?? '—'}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Breakdown title="By trip type" rows={data?.byTrip} money />
        <Breakdown title="By vehicle requested" rows={data?.byVehicle} />
        <Breakdown title="Completed trips by driver" rows={data?.byDriver} />
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
              <div className="flex justify-between gap-3"><span className="truncate">{r.label}</span><span className="font-semibold">{r.n}{money && r.revenue ? ` · ${inr(r.revenue)}` : ''}</span></div>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-mist"><span className="block h-full rounded-full bg-gold" style={{ width: `${(r.n / max) * 100}%` }} /></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
