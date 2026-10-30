import { useState } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'framer-motion'
import { LoaderCircle, LockKeyhole } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../lib/auth'
import { EASE } from '../lib/motion'

/** Admin sign-in shown at /admin when nobody is signed in. Customers who sign in here get "no access". */
export default function AdminLogin() {
  const { login } = useAuth()
  const [f, setF] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!f.email || !f.password) return setError('Enter your email and password.')
    setBusy(true)
    setError('')
    try { await login(f.email, f.password) } catch (ex) { setError(ex.message) } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-midnight px-4 py-10">
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="w-full max-w-sm">
        <div className="mb-8 flex justify-center text-white"><Logo /></div>
        <form onSubmit={submit} noValidate className="rounded-[1.75rem] bg-white p-7 shadow-2xl">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-midnight text-gold"><LockKeyhole className="h-5 w-5" /></span>
          <h1 className="mt-5 text-2xl font-semibold">Admin sign in</h1>
          <p className="mt-1 text-sm text-slate">For TTT Cabs staff only.</p>
          {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <label className="field mt-5"><span className="field-label">Email</span>
            <input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="username" autoFocus />
          </label>
          <label className="field mt-4"><span className="field-label">Password</span>
            <input type="password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
          </label>
          <button disabled={busy} className="btn btn-navy mt-6 w-full">{busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Signing in…</> : 'Sign in'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-white/60"><Link to="/" className="hover:text-white">Back to website</Link></p>
      </m.div>
    </div>
  )
}
