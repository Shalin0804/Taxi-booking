import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import StatusBadge, { statusLabel } from '../components/StatusBadge'
import { DataTable, Modal, PageHeader, Spinner, date, inr, useApi, useToast } from './kit'
import { download, request } from '../lib/api'
import { tripTypes } from '../data/site'

const STATUSES = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']

export default function Bookings() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [selected, setSelected] = useState(null)
  const toast = useToast()
  const filters = Object.fromEntries(['status', 'trip', 'from', 'to', 'q', 'page'].map((k) => [k, params.get(k) || '']))
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
  const { data, error, loading, reload } = useApi(`/api/admin/bookings${qs ? `?${qs}` : ''}`)

  // Search as you type, debounced.
  useEffect(() => {
    const t = setTimeout(() => q !== filters.q && update({ q }), 350)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(patch) {
    const next = { ...filters, page: '', ...patch }
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const page = data?.page || 1

  const exportCsv = async () => {
    try {
      const f = new URLSearchParams(Object.entries(filters).filter(([k, v]) => v && k !== 'page')).toString()
      await download(`/api/admin/bookings.csv${f ? `?${f}` : ''}`, `tttcabs-bookings-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <>
      <PageHeader title="Bookings" sub={data ? `${data.total} matching booking${data.total === 1 ? '' : 's'}` : 'Loading…'}>
        <button onClick={exportCsv} className="btn btn-line !px-4 !py-2.5"><Download className="h-4 w-4" /> Export to Excel</button>
      </PageHeader>

      <div className="mb-4 grid gap-2 rounded-2xl bg-white p-3 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <label className="relative">
          <span className="sr-only">Search bookings</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Reference, name, phone or place" className="input !py-2.5 pl-10" />
        </label>
        <select aria-label="Status" value={filters.status} onChange={(e) => update({ status: e.target.value })} className="input !py-2.5">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select aria-label="Trip type" value={filters.trip} onChange={(e) => update({ trip: e.target.value })} className="input !py-2.5">
          <option value="">All trips</option>
          {tripTypes.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input aria-label="Pickup from" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} className="input !py-2.5" />
        <input aria-label="Pickup to" type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} className="input !py-2.5" />
      </div>

      <DataTable loading={loading} error={error} rows={data?.rows} onRowClick={setSelected}
        empty="No bookings match these filters."
        columns={[
          { key: 'reference', label: 'Reference', className: 'font-medium whitespace-nowrap' },
          { key: 'name', label: 'Customer', render: (r) => <><span className="block font-medium">{r.name}</span><span className="text-slate">{r.phone}</span></> },
          { key: 'route', label: 'Route', render: (r) => <span className="line-clamp-2 max-w-xs">{r.pickup}{r.dropoff ? ` to ${r.dropoff}` : ''}</span> },
          { key: 'pickup_date', label: 'Pickup', render: (r) => <span className="whitespace-nowrap">{date(r.pickup_date)}, {r.pickup_time?.slice(0, 5)}</span> },
          { key: 'trip_type', label: 'Trip' },
          { key: 'driver_name', label: 'Driver', render: (r) => r.driver_name || <span className="text-slate">Unassigned</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]} />

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button className="btn btn-line !px-4 !py-2" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</button>
          <span className="px-2 text-slate">Page {page} of {pages}</span>
          <button className="btn btn-line !px-4 !py-2" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Next</button>
        </div>
      )}

      <BookingDetail booking={selected} onClose={() => setSelected(null)} onSaved={() => { reload(); toast('Booking updated') }} />
    </>
  )
}

function BookingDetail({ booking, onClose, onSaved }) {
  const toast = useToast()
  const drivers = useApi('/api/admin/drivers')
  const vehicles = useApi('/api/admin/vehicles')
  const [f, setF] = useState({})
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (booking) setF({ status: booking.status, driver_id: booking.driver_id ?? '', vehicle_id: booking.vehicle_id ?? '', fare: booking.fare ?? '', admin_notes: booking.admin_notes ?? '' })
  }, [booking])
  if (!booking) return <Modal open={false} onClose={onClose} />
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await request(`/api/admin/bookings/${booking.id}`, { method: 'PATCH', body: f })
      onSaved()
      onClose()
    } catch (ex) {
      toast(ex.fields ? Object.values(ex.fields).join(', ') : ex.message, 'error')
    } finally { setBusy(false) }
  }

  const b = booking
  const rows = [
    ['Trip', b.trip_type], ['Pickup', b.pickup], ['Destination', b.dropoff || '—'],
    ['When', `${date(b.pickup_date)}, ${b.pickup_time?.slice(0, 5)}${b.return_date ? ` · returns ${date(b.return_date)}` : ''}`],
    ['Vehicle wanted', b.vehicle_pref || '—'], ['Passengers', b.passengers || '—'],
    ['Customer', `${b.name} · ${b.phone}${b.email ? ` · ${b.email}` : ''}`], ['Notes', b.notes || '—'],
    ['Received', new Date(b.created_at.replace(' ', 'T')).toLocaleString('en-IN')], ['Account', b.user_id ? 'Signed-in customer' : 'Guest'],
  ]
  return (
    <Modal open onClose={onClose} title={`Booking ${b.reference}`} wide>
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        <dl className="grid content-start gap-2.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3"><dt className="text-slate">{k}</dt><dd className="break-words">{v}</dd></div>
          ))}
          <div className="mt-2 flex gap-2">
            <a href={`tel:${b.phone}`} className="btn btn-line !px-4 !py-2 text-sm">Call customer</a>
          </div>
        </dl>
        <form onSubmit={save} className="grid content-start gap-4 rounded-2xl bg-mist p-4 sm:p-5">
          <label className="field"><span className="field-label">Status</span>
            <select className="input" value={f.status} onChange={set('status')}>{STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</select>
          </label>
          <label className="field"><span className="field-label">Driver</span>
            <select className="input" value={f.driver_id} onChange={set('driver_id')}>
              <option value="">Unassigned</option>
              {drivers.data?.rows.map((d) => <option key={d.id} value={d.id} disabled={d.status === 'inactive'}>{d.name} · {statusLabel(d.status)}</option>)}
            </select>
          </label>
          <label className="field"><span className="field-label">Vehicle</span>
            <select className="input" value={f.vehicle_id} onChange={set('vehicle_id')}>
              <option value="">Unassigned</option>
              {vehicles.data?.rows.map((v) => <option key={v.id} value={v.id} disabled={v.status !== 'active'}>{v.category} · {v.model} · {v.registration}</option>)}
            </select>
          </label>
          <label className="field"><span className="field-label">Fare (₹)</span>
            <input type="number" min="0" step="1" className="input" value={f.fare} onChange={set('fare')} placeholder={inr(null)} />
          </label>
          <label className="field"><span className="field-label">Internal notes</span>
            <textarea rows={3} className="input" value={f.admin_notes} onChange={set('admin_notes')} />
          </label>
          <button disabled={busy} className="btn btn-navy">{busy ? <><Spinner /> Saving…</> : 'Save changes'}</button>
        </form>
      </div>
    </Modal>
  )
}
