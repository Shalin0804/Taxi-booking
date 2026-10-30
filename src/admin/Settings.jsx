import { useState } from 'react'
import { Field } from '../components/forms'
import { PageHeader, Spinner, useToast } from './kit'
import { request } from '../lib/api'
import { roleLabel, useAdmin } from './adminAuth'

export default function Settings() {
  const { user, setUser } = useAdmin()
  const toast = useToast()
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    const err = {}
    if (f.newPassword.length < 10) err.newPassword = 'Use at least 10 characters'
    if (f.confirm !== f.newPassword) err.confirm = "Passwords don't match"
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      await request('/api/admin/auth/password', { method: 'POST', body: f })
      setF({ currentPassword: '', newPassword: '', confirm: '' })
      toast('Password changed. Your other sessions were signed out.')
    } catch (ex) { setErrors({ form: ex.message, ...(ex.fields || {}) }) } finally { setBusy(false) }
  }

  const everywhere = async () => {
    await request('/api/admin/auth/logout-everywhere', { method: 'POST' }).catch(() => {})
    setUser(null)
  }

  return (
    <>
      <PageHeader title="Settings" sub="Your admin account." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
          <h2 className="font-semibold">Account</h2>
          <dl className="mt-4 grid gap-2.5 text-sm">
            <div className="grid grid-cols-[6rem_1fr]"><dt className="text-slate">Name</dt><dd>{user.name}</dd></div>
            <div className="grid grid-cols-[6rem_1fr]"><dt className="text-slate">Email</dt><dd className="break-all">{user.email}</dd></div>
            <div className="grid grid-cols-[6rem_1fr]"><dt className="text-slate">Role</dt><dd>{roleLabel(user.role)}</dd></div>
          </dl>
          <h3 className="mt-6 text-sm font-semibold">What your role can do</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {user.permissions.map((p) => <li key={p} className="rounded-full bg-mist px-2.5 py-1 text-xs text-slate">{p.replace(':', ' · ')}</li>)}
          </ul>
          <button onClick={everywhere} className="btn btn-line mt-8 !py-2.5">Sign out on all devices</button>
        </section>
        <form onSubmit={save} noValidate className="grid content-start gap-4 rounded-2xl bg-white p-6 ring-1 ring-line">
          <h2 className="font-semibold">Change password</h2>
          {errors.form && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.form}</p>}
          <Field label="Current password" error={errors.currentPassword}><input type="password" className="input" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></Field>
          <Field label="New password" error={errors.newPassword} hint="At least 10 characters"><input type="password" className="input" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
          <Field label="Confirm new password" error={errors.confirm}><input type="password" className="input" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></Field>
          <button disabled={busy} className="btn btn-navy justify-self-start !py-2.5">{busy ? <><Spinner /> Saving…</> : 'Change password'}</button>
        </form>
      </div>
    </>
  )
}
