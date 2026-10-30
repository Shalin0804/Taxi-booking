import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { Field } from '../components/forms'
import { DataTable, Modal, PageHeader, Spinner, date, useApi, useToast } from './kit'
import { request } from '../lib/api'
import { roleLabel, useAdmin } from './adminAuth'

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER', 'FLEET_MANAGER', 'SUPPORT_STAFF']
const ROLE_HELP = {
  SUPER_ADMIN: 'Everything, including team, roles and the audit log',
  ADMIN: 'Bookings, customers, fleet, pricing, enquiries and reports',
  BOOKING_MANAGER: 'Bookings, assignments, exports and reports',
  FLEET_MANAGER: 'Vehicles and drivers',
  SUPPORT_STAFF: 'Customers, enquiries and read-only bookings',
}

export function Customers() {
  const { can } = useAdmin()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 350); return () => clearTimeout(t) }, [q])
  const { data, error, loading, reload } = useApi(`/api/admin/customers${debounced ? `?q=${encodeURIComponent(debounced)}` : ''}`)

  const setStatus = async (c, status) => {
    try {
      await request(`/api/admin/customers/${c.id}`, { method: 'PATCH', body: { status } })
      toast(status === 'disabled' ? `${c.name} can no longer sign in` : `${c.name} can sign in again`)
      reload()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <>
      <PageHeader title="Customers" sub="People who created an account on the website." />
      <label className="relative mb-4 block max-w-md">
        <span className="sr-only">Search customers</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" className="input !py-2.5 pl-10" />
      </label>
      <DataTable loading={loading} error={error} rows={data?.rows} empty="No customer accounts yet."
        columns={[
          { key: 'name', label: 'Name', className: 'font-medium' },
          { key: 'email', label: 'Email', render: (r) => <a href={`mailto:${r.email}`} className="text-electric">{r.email}</a> },
          { key: 'phone', label: 'Phone' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'created_at', label: 'Joined', render: (r) => date(r.created_at) },
          { key: 'status', label: 'Account', render: (r) => can('customers:write') ? (
            <select aria-label={`Account status for ${r.name}`} className="input !w-auto !py-1.5 text-sm" value={r.status} onChange={(e) => setStatus(r, e.target.value)}>
              <option value="active">Active</option><option value="disabled">Disabled</option>
            </select>
          ) : <StatusBadge status={r.status === 'active' ? 'active' : 'inactive'} /> },
        ]} />
    </>
  )
}

export function Team() {
  const { user: me } = useAdmin()
  const [tab, setTab] = useState('team')
  return (
    <>
      <PageHeader title="Team & roles" sub="Only super admins can see this page." />
      <div className="mb-5 flex w-fit rounded-full bg-white p-1 ring-1 ring-line" role="tablist">
        {[['team', 'Team'], ['audit', 'Audit log']].map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${tab === v ? 'bg-midnight text-white' : 'text-slate hover:text-ink'}`}>{l}</button>
        ))}
      </div>
      {tab === 'team' ? <TeamList me={me} /> : <AuditLog />}
    </>
  )
}

function TeamList({ me }) {
  const { data, error, loading, reload } = useApi('/api/admin/users')
  const [adding, setAdding] = useState(false)
  const toast = useToast()
  const change = async (u, body, msg) => {
    try {
      await request(`/api/admin/users/${u.id}`, { method: 'PATCH', body })
      toast(msg)
      reload()
    } catch (e) { toast(e.message, 'error') }
  }
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setAdding(true)} className="btn btn-navy !px-4 !py-2.5"><Plus className="h-4 w-4" /> Add team member</button>
      </div>
      <DataTable loading={loading} error={error} rows={data?.rows}
        columns={[
          { key: 'name', label: 'Name', className: 'font-medium' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (u) => u.id === me.id ? <span className="font-medium">{roleLabel(u.role)} (you)</span> : (
            <select aria-label={`Role for ${u.name}`} className="input !w-auto !py-1.5 text-sm" value={u.role} onChange={(e) => change(u, { role: e.target.value }, `${u.name} is now ${roleLabel(e.target.value)}`)}>
              {STAFF_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          ) },
          { key: 'status', label: 'Access', render: (u) => u.id === me.id ? <StatusBadge status="active" /> : (
            <select aria-label={`Access for ${u.name}`} className="input !w-auto !py-1.5 text-sm" value={u.status} onChange={(e) => change(u, { status: e.target.value }, e.target.value === 'disabled' ? `${u.name} has been signed out and blocked` : `${u.name} can sign in again`)}>
              <option value="active">Active</option><option value="disabled">Disabled</option>
            </select>
          ) },
          { key: 'created_at', label: 'Added', render: (u) => date(u.created_at) },
        ]} />
      <dl className="mt-6 grid gap-2 rounded-2xl bg-white p-5 text-sm ring-1 ring-line sm:grid-cols-2">
        {STAFF_ROLES.map((r) => <div key={r}><dt className="font-semibold">{roleLabel(r)}</dt><dd className="text-slate">{ROLE_HELP[r]}</dd></div>)}
      </dl>
      {adding && <AddMember onClose={() => setAdding(false)} onSaved={() => { reload(); toast('Team member added') }} />}
    </>
  )
}

function AuditLog() {
  const { data, error, loading } = useApi('/api/admin/audit')
  return (
    <DataTable loading={loading} error={error} rows={data?.rows} empty="No activity yet."
      columns={[
        { key: 'created_at', label: 'When', render: (r) => <span className="whitespace-nowrap">{new Date(r.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-IN')}</span> },
        { key: 'user_email', label: 'Who', render: (r) => r.user_email || '—' },
        { key: 'action', label: 'Action', className: 'font-medium' },
        { key: 'entity', label: 'Record', render: (r) => r.entity ? `${r.entity}${r.entity_id ? ` #${r.entity_id}` : ''}` : '—' },
        { key: 'details', label: 'Details', render: (r) => <span className="line-clamp-2 max-w-sm break-all text-xs text-slate">{r.details || ''}</span> },
        { key: 'ip', label: 'IP', render: (r) => <span className="text-xs text-slate">{r.ip}</span> },
      ]} />
  )
}

function AddMember({ onClose, onSaved }) {
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'SUPPORT_STAFF' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await request('/api/admin/users', { method: 'POST', body: f })
      onSaved()
      onClose()
    } catch (ex) { setErrors({ form: ex.message, ...(ex.fields || {}) }) } finally { setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title="Add team member">
      <form onSubmit={save} noValidate className="grid gap-4">
        {errors.form && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.form}</p>}
        <Field label="Full name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} /></Field>
        <Field label="Email" error={errors.email}><input type="email" className="input" value={f.email} onChange={set('email')} /></Field>
        <Field label="Temporary password" error={errors.password} hint="At least 10 characters. Share it privately; they can change it in Settings.">
          <input type="password" autoComplete="new-password" className="input" value={f.password} onChange={set('password')} />
        </Field>
        <Field label="Role" hint={ROLE_HELP[f.role]}>
          <select className="input" value={f.role} onChange={set('role')}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</select>
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-line !py-2.5">Cancel</button>
          <button disabled={busy} className="btn btn-navy !py-2.5">{busy ? <><Spinner /> Adding…</> : 'Add team member'}</button>
        </div>
      </form>
    </Modal>
  )
}
