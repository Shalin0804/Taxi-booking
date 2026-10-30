// Vehicles, drivers and pricing share one list + form page, driven by a field config.
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { Field } from '../components/forms'
import { DataTable, Modal, PageHeader, Spinner, inr, useApi, useToast } from './kit'
import { request } from '../lib/api'
import { fleet, tripTypes } from '../data/site'
import { useAdmin } from './adminAuth'

const categories = fleet.map((f) => f.name)

function ResourcePage({ title, sub, path, noun, fields, columns, blank, writePerm }) {
  const { can } = useAdmin()
  const canWrite = can(writePerm)
  const { data, error, loading, reload } = useApi(path)
  const [editing, setEditing] = useState(null) // null | {} (new) | row
  const [confirm, setConfirm] = useState(null)
  const toast = useToast()

  const remove = async () => {
    try {
      await request(`${path}/${confirm.id}`, { method: 'DELETE' })
      toast(`${noun} deleted`)
      reload()
    } catch (e) { toast(e.message, 'error') } finally { setConfirm(null) }
  }

  return (
    <>
      <PageHeader title={title} sub={canWrite ? sub : `${sub} Your role can view this list but not change it.`}>
        {canWrite && <button onClick={() => setEditing(blank)} className="btn btn-navy !px-4 !py-2.5"><Plus className="h-4 w-4" /> Add {noun.toLowerCase()}</button>}
      </PageHeader>
      <DataTable loading={loading} error={error} rows={data?.rows} empty={`No ${title.toLowerCase()} yet. Add the first one.`}
        columns={!canWrite ? columns : [...columns, {
          key: 'actions', label: '', className: 'text-right whitespace-nowrap',
          render: (r) => (
            <span className="inline-flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); setEditing(r) }} className="grid h-9 w-9 place-items-center rounded-lg text-navy hover:bg-mist" aria-label={`Edit ${noun.toLowerCase()}`}><Pencil className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); setConfirm(r) }} className="grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Delete ${noun.toLowerCase()}`}><Trash2 className="h-4 w-4" /></button>
            </span>
          ),
        }]} />
      <EditForm key={editing?.id ?? (editing ? 'new' : 'none')} item={editing} fields={fields} path={path} noun={noun}
        onClose={() => setEditing(null)} onSaved={(isNew) => { reload(); toast(isNew ? `${noun} added` : `${noun} updated`) }} />
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Delete this ${noun.toLowerCase()}?`}>
        <p className="text-slate">This permanently removes it. Bookings that used it keep their history but lose the link.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setConfirm(null)} className="btn btn-line !py-2.5">Keep it</button>
          <button onClick={remove} className="btn !bg-red-600 !py-2.5 text-white">Delete {noun.toLowerCase()}</button>
        </div>
      </Modal>
    </>
  )
}

function EditForm({ item, fields, path, noun, onClose, onSaved }) {
  const isNew = !item?.id
  const [f, setF] = useState(() => Object.fromEntries(fields.map((x) => [x.key, item?.[x.key] ?? x.default ?? ''])))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      await request(isNew ? path : `${path}/${item.id}`, { method: isNew ? 'POST' : 'PATCH', body: f })
      onSaved(isNew)
      onClose()
    } catch (ex) {
      setErrors({ form: ex.message, ...(ex.fields || {}) })
    } finally { setBusy(false) }
  }

  return (
    <Modal open={!!item} onClose={onClose} title={isNew ? `Add ${noun.toLowerCase()}` : `Edit ${noun.toLowerCase()}`}>
      <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
        {errors.form && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2" role="alert">{errors.form}</p>}
        {fields.map((x) => (
          <Field key={x.key} label={x.label} error={errors[x.key]} className={x.wide ? 'sm:col-span-2' : ''}>
            {x.options ? (
              <select className="input" value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })}>
                {x.placeholder && <option value="">{x.placeholder}</option>}
                {x.options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
              </select>
            ) : (
              <input className="input" type={x.type || 'text'} min={x.type === 'number' ? 0 : undefined} step={x.step} list={x.list}
                value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} aria-invalid={!!errors[x.key]} />
            )}
          </Field>
        ))}
        <datalist id="vehicle-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn btn-line !py-2.5">Cancel</button>
          <button disabled={busy} className="btn btn-navy !py-2.5">{busy ? <><Spinner /> Saving…</> : isNew ? `Add ${noun.toLowerCase()}` : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  )
}

export const Vehicles = () => (
  <ResourcePage writePerm="fleet:write" title="Vehicles" noun="Vehicle" path="/api/admin/vehicles" sub="Cars you can assign to bookings."
    blank={{}}
    fields={[
      { key: 'category', label: 'Category', list: 'vehicle-categories' },
      { key: 'model', label: 'Model' },
      { key: 'registration', label: 'Registration number' },
      { key: 'status', label: 'Status', default: 'active', options: [{ value: 'active', label: 'Active' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'inactive', label: 'Inactive' }] },
      { key: 'seats', label: 'Seats', type: 'number' },
      { key: 'luggage', label: 'Luggage (bags)', type: 'number' },
    ]}
    columns={[
      { key: 'model', label: 'Model', className: 'font-medium' },
      { key: 'category', label: 'Category' },
      { key: 'registration', label: 'Registration' },
      { key: 'seats', label: 'Seats' },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ]} />
)

export const Drivers = () => (
  <ResourcePage writePerm="fleet:write" title="Drivers" noun="Driver" path="/api/admin/drivers" sub="Driver-partners you can assign to bookings."
    blank={{}}
    fields={[
      { key: 'name', label: 'Full name' },
      { key: 'phone', label: 'Mobile number', type: 'tel' },
      { key: 'license_no', label: 'Licence number' },
      { key: 'status', label: 'Status', default: 'available', options: [{ value: 'available', label: 'Available' }, { value: 'on_trip', label: 'On trip' }, { value: 'off_duty', label: 'Off duty' }, { value: 'inactive', label: 'Inactive' }] },
    ]}
    columns={[
      { key: 'name', label: 'Name', className: 'font-medium' },
      { key: 'phone', label: 'Phone' },
      { key: 'license_no', label: 'Licence' },
      { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ]} />
)

export const Pricing = () => (
  <ResourcePage writePerm="pricing:write" title="Pricing" noun="Rate" path="/api/admin/pricing" sub="Internal rate card used when quoting fares. Not shown on the website."
    blank={{}}
    fields={[
      { key: 'trip_type', label: 'Trip type', options: tripTypes, placeholder: 'Choose a trip type' },
      { key: 'vehicle_category', label: 'Vehicle category', list: 'vehicle-categories' },
      { key: 'base_fare', label: 'Base fare (₹)', type: 'number', step: '1' },
      { key: 'per_km', label: 'Per km (₹)', type: 'number', step: '0.5' },
      { key: 'per_hour', label: 'Per hour (₹)', type: 'number', step: '1' },
      { key: 'active', label: 'Status', default: 1, options: [{ value: 1, label: 'Active' }, { value: 0, label: 'Paused' }] },
      { key: 'notes', label: 'Notes', wide: true },
    ]}
    columns={[
      { key: 'trip_type', label: 'Trip type', className: 'font-medium' },
      { key: 'vehicle_category', label: 'Vehicle' },
      { key: 'base_fare', label: 'Base', render: (r) => inr(r.base_fare) },
      { key: 'per_km', label: 'Per km', render: (r) => inr(r.per_km) },
      { key: 'per_hour', label: 'Per hour', render: (r) => inr(r.per_hour) },
      { key: 'active', label: 'Status', render: (r) => <StatusBadge status={r.active ? 'active' : 'inactive'} /> },
    ]} />
)
