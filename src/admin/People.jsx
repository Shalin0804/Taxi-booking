import { useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Field } from '../components/forms'
import { DataTable, Modal, PageHeader, Spinner, date, useApi, useToast } from './kit'
import { request } from '../lib/api'

export function Customers() {
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 350); return () => clearTimeout(t) }, [q])
  const { data, error, loading } = useApi(`/api/admin/customers${debounced ? `?q=${encodeURIComponent(debounced)}` : ''}`)
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
        ]} />
    </>
  )
}

export function Users({ me }) {
  const { data, error, loading, reload } = useApi('/api/admin/users')
  const [adding, setAdding] = useState(false)
  const toast = useToast()

  const changeRole = async (u, role) => {
    try {
      await request(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { role } })
      toast(role === 'customer' ? `${u.name} no longer has admin access` : `${u.name} is now ${role}`)
      reload()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <>
      <PageHeader title="Team & roles" sub="Staff manage bookings, fleet, drivers and enquiries. Admins can also edit pricing and the team.">
        <button onClick={() => setAdding(true)} className="btn btn-navy !px-4 !py-2.5"><Plus className="h-4 w-4" /> Add team member</button>
      </PageHeader>
      <DataTable loading={loading} error={error} rows={data?.rows}
        columns={[
          { key: 'name', label: 'Name', className: 'font-medium' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (u) => u.id === me.id ? <span className="font-medium capitalize">{u.role} (you)</span> : (
            <select aria-label={`Role for ${u.name}`} className="input !w-auto !py-2" value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="customer">Remove access</option>
            </select>
          ) },
          { key: 'created_at', label: 'Added', render: (u) => date(u.created_at) },
        ]} />
      {adding && <AddMember onClose={() => setAdding(false)} onSaved={() => { reload(); toast('Team member added') }} />}
    </>
  )
}

function AddMember({ onClose, onSaved }) {
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'staff' })
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
        <Field label="Temporary password" error={errors.password} hint="At least 10 characters. Share it privately.">
          <input type="password" autoComplete="new-password" className="input" value={f.password} onChange={set('password')} />
        </Field>
        <Field label="Role">
          <select className="input" value={f.role} onChange={set('role')}><option value="staff">Staff</option><option value="admin">Admin</option></select>
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-line !py-2.5">Cancel</button>
          <button disabled={busy} className="btn btn-navy !py-2.5">{busy ? <><Spinner /> Adding…</> : 'Add team member'}</button>
        </div>
      </form>
    </Modal>
  )
}
