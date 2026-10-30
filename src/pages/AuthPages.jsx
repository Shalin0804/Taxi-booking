import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { m } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import Seo from '../components/Seo'
import { Page, Picture } from '../components/ui'
import { Field, isEmail, isPhone } from '../components/forms'
import { isStaff, useAuth } from '../lib/auth'
import { API_URL } from '../lib/api'
import { company } from '../data/site'
import { EASE } from '../lib/motion'

/** Only same-site paths are allowed as a post-login destination. */
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : null)

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
        <m.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="mx-auto w-full max-w-md rounded-[1.75rem] bg-white p-6 sm:p-8 lg:p-0">
          <h1 className="text-[clamp(2.2rem,4vw,3rem)]">{title}</h1>
          <p className="mt-3 text-slate">{lede}</p>
          {!API_URL && (
            <p className="mt-6 rounded-xl bg-gold/15 p-4 text-sm text-[#6f5626]" role="status">
              Accounts aren't connected yet. To book now, call <a className="font-semibold underline" href={company.phoneHref}>{company.phoneDisplay}</a>.
            </p>
          )}
          {children}
        </m.div>
      </div>
    </section>
  )
}

function PasswordInput({ value, onChange, invalid, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className="input pr-12" value={value} onChange={onChange} autoComplete={autoComplete} aria-invalid={invalid || undefined} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate hover:bg-mist">
        {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  )
}

function FormError({ message }) {
  return message ? <p className="rounded-xl bg-red-50 p-3.5 text-sm text-red-700" role="alert">{message}</p> : null
}

const destination = (user, next) => safeNext(next) || (isStaff(user) ? '/admin' : '/account')

export function Login() {
  const { login, user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [f, setF] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={destination(user, params.get('next'))} replace />

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (!isEmail(f.email)) err.email = 'Enter the email you signed up with'
    if (!f.password) err.password = 'Enter your password'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      const u = await login(f.email, f.password)
      nav(destination(u, params.get('next')), { replace: true })
    } catch (ex) {
      setErrors({ form: ex.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <Seo path="/login" />
      <meta name="robots" content="noindex" />
      <AuthShell title="Welcome back." lede="Sign in to track your bookings.">
        <form onSubmit={submit} noValidate className="mt-8 grid gap-5">
          <FormError message={errors.form} />
          <Field label="Email" error={errors.email}>
            <input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" aria-invalid={!!errors.email} />
          </Field>
          <Field label="Password" error={errors.password}>
            <PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} invalid={!!errors.password} autoComplete="current-password" />
          </Field>
          <button type="submit" disabled={busy || !API_URL} className="btn btn-navy mt-2 w-full">
            {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign in <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="text-center text-sm text-slate">
            New to TTT Cabs? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`} className="font-semibold text-electric">Create an account</Link>
          </p>
          <p className="text-center text-xs text-slate">
            Forgot your password? Call <a href={company.phoneHref} className="font-semibold">{company.phoneDisplay}</a> and we'll reset it.
          </p>
        </form>
      </AuthShell>
    </Page>
  )
}

export function Signup() {
  const { signup, user } = useAuth()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={destination(user, params.get('next'))} replace />
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
      const u = await signup(f)
      nav(destination(u, params.get('next')), { replace: true })
    } catch (ex) {
      setErrors({ form: ex.message, ...(ex.fields || {}) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page>
      <Seo path="/signup" />
      <meta name="robots" content="noindex" />
      <AuthShell title="Create your account." lede="Book faster with saved details and follow every trip, from confirmation to driver assignment." image="group">
        <form onSubmit={submit} noValidate className="mt-8 grid gap-5">
          <FormError message={errors.form} />
          <Field label="Full name" error={errors.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} /></Field>
          <Field label="Email" error={errors.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} /></Field>
          <Field label="Mobile number" error={errors.phone}><input type="tel" inputMode="tel" className="input" value={f.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={!!errors.phone} /></Field>
          <Field label="Password" error={errors.password} hint="At least 8 characters">
            <PasswordInput value={f.password} onChange={set('password')} invalid={!!errors.password} autoComplete="new-password" />
          </Field>
          <button type="submit" disabled={busy || !API_URL} className="btn btn-gold mt-2 w-full">
            {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Creating account…</> : <>Create account <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="text-center text-sm text-slate">
            Already have an account? <Link to="/login" className="font-semibold text-electric">Sign in</Link>
          </p>
        </form>
      </AuthShell>
    </Page>
  )
}


