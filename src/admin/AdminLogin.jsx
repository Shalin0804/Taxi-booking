import { useState } from 'react'
import { m } from 'framer-motion'
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react'
import Logo from '../components/Logo'
import { useAdmin } from './adminAuth'
import { EASE } from '../lib/motion'

/** Administrator sign-in at /secure-admin-portal. Deliberately separate from the customer login. */
export default function AdminLogin() {
  const { login } = useAdmin()
  const [f, setF] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)
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
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[#050d19] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" aria-hidden="true" />
      <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="relative w-full max-w-[25rem]">
        <div className="mb-8 flex items-center justify-between text-white">
          <Logo />
          <span className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs text-white/60"><ShieldCheck className="h-3.5 w-3.5 text-gold" /> Restricted area</span>
        </div>
        <form onSubmit={submit} noValidate className="rounded-2xl border border-white/10 bg-[#0b1a2e] p-7 text-white shadow-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Administrator Login</h1>
          <p className="mt-1 text-sm text-white/55">Authorised TTT Cabs staff only. Sign-ins are logged.</p>
          {error && <p className="mt-5 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200" role="alert">{error}</p>}
          <label className="mt-6 block">
            <span className="mb-1.5 block text-sm text-white/70">Email</span>
            <input type="email" className="input-dark !py-3" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="username" autoFocus />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm text-white/70">Password</span>
            <span className="relative block">
              <input type={show ? 'text' : 'password'} className="input-dark !py-3 pr-12" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-white/60 hover:bg-white/10">
                {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </span>
          </label>
          <button disabled={busy} className="btn btn-gold mt-7 w-full">
            {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Verifying…</> : <><ShieldCheck className="h-4 w-4" /> Secure login</>}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-white/40">Locked after 5 failed attempts for 15 minutes.</p>
      </m.div>
    </div>
  )
}
