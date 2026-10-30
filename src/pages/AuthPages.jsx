import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { m } from 'framer-motion'
import { ArrowRight, CircleCheck, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import Seo from '../components/Seo'
import { Page, Picture } from '../components/ui'
import { Field, isEmail, isPhone } from '../components/forms'
import { useAuth } from '../lib/auth'
import { request, safeNext } from '../lib/api'
import { EASE } from '../lib/motion'

/** Keeps ?next= when moving between login, register and forgot-password. */
const withNext = (path, next) => (next ? `${path}?next=${encodeURIComponent(next)}` : path)

function AuthShell({ title, lede, children, image = 'chauffeur' }) {
  return (
    <section className="grid min-h-[100svh] bg-midnight lg:grid-cols-[1fr_1.05fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <Picture name={image} alt="" priority sizes="50vw" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/40 to-midnight/20" />
        <p className="absolute bottom-14 left-12 right-12 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
          Your journey. Our priority.
        </p>
      </div>
      <div className="flex items-center px-4 pb-16 pt-28 sm:px-10 lg:rounded-l-[2rem] lg:bg-white">
        <m.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}
          className="mx-auto w-full max-w-md rounded-[1.75rem] bg-white p-6 sm:p-8 lg:p-0">
          <h1 className="text-[clamp(2.2rem,4vw,3rem)]">{title}</h1>
          {lede && <p className="mt-3 text-slate">{lede}</p>}
          {children}
        </m.div>
      </div>
    </section>
  )
}

export function PasswordInput({ value, onChange, invalid, autoComplete, id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} className="input pr-12" value={value} onChange={onChange} autoComplete={autoComplete} aria-invalid={invalid || undefined} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate hover:bg-mist">
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  )
}

export function FormError({ message }) {
  return message ? <p className="rounded-xl bg-red-50 p-3.5 text-sm text-red-700" role="alert">{message}</p> : null
}

function Submit({ busy, busyText, children, gold }) {
  return (
    <button type="submit" disabled={busy} className={`btn ${gold ? 'btn-gold' : 'btn-navy'} mt-2 w-full`}>
      {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> {busyText}</> : <>{children} <ArrowRight className="h-4 w-4" /></>}
    </button>
  )
}

export function Login() {
  const { login, user, ready } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [f, setF] = useState({ identifier: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  if (ready && user) return <Navigate to={next || '/my-account'} replace />

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (!f.identifier.trim()) err.identifier = 'Enter your email or mobile number'
    if (!f.password) err.password = 'Enter your password'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      await login(f.identifier.trim(), f.password, f.remember)
      nav(next || '/my-account', { replace: true })
    } catch (ex) {
      setErrors({ form: ex.message })
    } finally {
      setBusy(false)
    }
  }

  const forBooking = next?.startsWith('/book') || next?.includes('plan-your-ride')
  return (
    <Page>
      <Seo path="/login" />
      <meta name="robots" content="noindex" />
      <AuthShell title="Welcome back." lede={forBooking ? 'Sign in to plan your ride.' : 'Sign in to book rides and follow your trips.'}>
        <form onSubmit={submit} noValidate className="mt-8 grid gap-5">
          <FormError message={errors.form} />
          <Field label="Email or mobile number" error={errors.identifier}>
            <input className="input" value={f.identifier} onChange={(e) => setF({ ...f, identifier: e.target.value })} autoComplete="username" aria-invalid={!!errors.identifier} />
          </Field>
          <Field label="Password" error={errors.password}>
            <PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} invalid={!!errors.password} autoComplete="current-password" />
          </Field>
          <div className="flex items-center justify-between gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={f.remember} onChange={(e) => setF({ ...f, remember: e.target.checked })} className="h-4 w-4 accent-[#10243d]" />
              Remember me
            </label>
            <Link to="/forgot-password" className="font-semibold text-electric">Forgot password?</Link>
          </div>
          <Submit busy={busy} busyText="Signing in…">Sign in</Submit>
          <p className="text-center text-sm text-slate">
            New to TTT Cabs? <Link to={withNext('/register', next)} className="font-semibold text-electric">Create an account</Link>
          </p>
        </form>
      </AuthShell>
    </Page>
  )
}

export function Register() {
  const { register, user, ready } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  if (ready && user) return <Navigate to={next || '/my-account'} replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (f.name.trim().length < 2) err.name = 'Enter your full name'
    if (!isEmail(f.email)) err.email = 'Enter a valid email, like name@example.com'
    if (!isPhone(f.phone)) err.phone = 'Enter a 10-digit mobile number'
    if (f.password.length < 8) err.password = 'Use at least 8 characters'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      await register(f)
      nav(next || '/my-account', { replace: true })
    } catch (ex) {
      setErrors({ form: ex.message, ...(ex.fields || {}) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <Seo path="/register" />
      <meta name="robots" content="noindex" />
      <AuthShell title="Create your account." lede="Book in a minute with your saved details, and follow every trip from confirmation to driver assignment." image="group">
        <form onSubmit={submit} noValidate className="mt-8 grid gap-5">
          <FormError message={errors.form} />
          <Field label="Full name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} /></Field>
          <Field label="Email" error={errors.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} /></Field>
          <Field label="Mobile number" error={errors.phone}><input type="tel" inputMode="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={!!errors.phone} /></Field>
          <Field label="Password" error={errors.password} hint="At least 8 characters">
            <PasswordInput value={f.password} onChange={set('password')} invalid={!!errors.password} autoComplete="new-password" />
          </Field>
          <Submit busy={busy} busyText="Creating account…" gold>Create account</Submit>
          <p className="text-center text-sm text-slate">
            Already have an account? <Link to={withNext('/login', next)} className="font-semibold text-electric">Sign in</Link>
          </p>
        </form>
      </AuthShell>
    </Page>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ busy: false, sent: false, error: '' })
  const submit = async (e) => {
    e.preventDefault()
    if (!isEmail(email)) return setState({ ...state, error: 'Enter the email you signed up with' })
    setState({ busy: true, sent: false, error: '' })
    try {
      await request('/api/auth/forgot-password', { method: 'POST', body: { email } })
      setState({ busy: false, sent: true, error: '' })
    } catch (ex) { setState({ busy: false, sent: false, error: ex.message }) }
  }
  return (
    <Page>
      <Seo path="/forgot-password" />
      <meta name="robots" content="noindex" />
      <AuthShell title="Reset your password." lede="We'll email you a link to choose a new password.">
        {state.sent ? (
          <div className="mt-8 rounded-2xl bg-mist p-6" role="status">
            <CircleCheck className="h-6 w-6 text-emerald-600" />
            <p className="mt-3 font-semibold">Check your inbox</p>
            <p className="mt-1 text-sm text-slate">If an account uses {email}, a reset link is on its way. It works once and expires in 30 minutes.</p>
            <Link to="/login" className="btn btn-navy mt-6">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-8 grid gap-5">
            <Field label="Email" error={state.error}>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" aria-invalid={!!state.error} />
            </Field>
            <Submit busy={state.busy} busyText="Sending…">Send reset link</Submit>
            <p className="text-center text-sm text-slate"><Link to="/login" className="font-semibold text-electric">Back to sign in</Link></p>
          </form>
        )}
      </AuthShell>
    </Page>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [f, setF] = useState({ password: '', confirm: '' })
  const [state, setState] = useState({ busy: false, done: false, errors: {} })
  const submit = async (e) => {
    e.preventDefault()
    const errors = {}
    if (f.password.length < 8) errors.password = 'Use at least 8 characters'
    if (f.confirm !== f.password) errors.confirm = "Passwords don't match"
    if (Object.keys(errors).length) return setState({ ...state, errors })
    setState({ busy: true, done: false, errors: {} })
    try {
      await request('/api/auth/reset-password', { method: 'POST', body: { token, password: f.password } })
      setState({ busy: false, done: true, errors: {} })
    } catch (ex) { setState({ busy: false, done: false, errors: { form: ex.message, ...(ex.fields || {}) } }) }
  }
  return (
    <Page>
      <Seo path="/reset-password" />
      <meta name="robots" content="noindex" />
      <AuthShell title="Choose a new password.">
        {state.done ? (
          <div className="mt-8 rounded-2xl bg-mist p-6" role="status">
            <CircleCheck className="h-6 w-6 text-emerald-600" />
            <p className="mt-3 font-semibold">Password updated</p>
            <p className="mt-1 text-sm text-slate">For your security, you've been signed out on every device.</p>
            <Link to="/login" className="btn btn-navy mt-6">Sign in</Link>
          </div>
        ) : !token ? (
          <div className="mt-8"><FormError message="This reset link is incomplete. Request a new one." /><Link to="/forgot-password" className="btn btn-navy mt-6">Request a new link</Link></div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-8 grid gap-5">
            <FormError message={state.errors.form} />
            <Field label="New password" error={state.errors.password} hint="At least 8 characters">
              <PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" invalid={!!state.errors.password} />
            </Field>
            <Field label="Confirm new password" error={state.errors.confirm}>
              <PasswordInput value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" invalid={!!state.errors.confirm} />
            </Field>
            <Submit busy={state.busy} busyText="Saving…">Update password</Submit>
            {state.errors.form && <Link to="/forgot-password" className="text-center text-sm font-semibold text-electric">Request a new link</Link>}
          </form>
        )}
      </AuthShell>
    </Page>
  )
}

/** Wraps customer-only pages: visitors are sent to /login and returned here afterwards. */
export function RequireCustomer({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="min-h-screen bg-midnight" />
  if (!user) {
    const here = window.location.pathname + window.location.search + window.location.hash
    return <Navigate to={`/login?next=${encodeURIComponent(here)}`} replace />
  }
  return children
}
