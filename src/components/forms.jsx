import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { CircleAlert, CircleCheck, LoaderCircle, MessageCircle, Phone, Mail } from 'lucide-react'
import { whatsappLink } from '../lib/api'
import { company } from '../data/site'
import { EASE } from '../lib/motion'

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
export const isPhone = (v) => /^(\+?91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, ''))

/** Submit lifecycle shared by every form: idle → sending → sent | error. */
export function useSubmit(send) {
  const [state, setState] = useState({ status: 'idle' })
  const run = async (payload) => {
    setState({ status: 'sending' })
    try {
      const res = await send(payload)
      setState({ status: 'sent', reference: res?.reference })
    } catch (e) {
      setState({ status: 'error', message: e.message, fields: e.fields })
    }
  }
  return [state, run, () => setState({ status: 'idle' })]
}

export function Field({ label, error, children, className = '', hint }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-slate">{hint}</span>}
      <AnimatePresence>
        {error && (
          <m.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="field-error block" role="alert">
            {error}
          </m.span>
        )}
      </AnimatePresence>
    </label>
  )
}

export function SubmitButton({ sending, children, className = 'btn-navy' }) {
  return (
    <button type="submit" disabled={sending} className={`btn ${className}`}>
      {sending ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : children}
    </button>
  )
}

/**
 * Result panel. On error the request was NOT received, so it offers one-tap ways to send it another way.
 */
export function SubmitResult({ state, title, summary, onReset, sentText, bare, children }) {
  if (state.status === 'idle' || state.status === 'sending') return null
  const wa = whatsappLink(title, summary)
  const mail = `mailto:${company.email}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
    Object.entries(summary).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n'))}`

  const content = {
    sent: {
      icon: <CircleCheck className="h-6 w-6" />, tone: 'bg-emerald-50 text-emerald-700',
      heading: 'Request received',
      body: `${sentText}${state.reference ? ` Your reference is ${state.reference}.` : ''}`,
    },
    error: {
      icon: <CircleAlert className="h-6 w-6" />, tone: 'bg-red-50 text-red-600',
      heading: "Your request didn't go through",
      body: `${state.message || 'Check your connection and try again.'} You can also send the same details on WhatsApp.`,
    },
  }[state.status]

  return (
    <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
      className={bare ? '' : 'rounded-[1.5rem] border border-line bg-white p-6 sm:p-8'} role="status" aria-live="polite">
      <span className={`grid h-12 w-12 place-items-center rounded-full ${content.tone}`}>{content.icon}</span>
      <h3 className="mt-5 text-2xl font-semibold">{content.heading}</h3>
      <p className="mt-2 text-slate">{content.body}</p>
      {state.status === 'sent' && children}
      {state.status !== 'sent' && (
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-navy"><MessageCircle className="h-4 w-4" /> Send on WhatsApp</a>
          <a href={mail} className="btn btn-line"><Mail className="h-4 w-4" /> Send by email</a>
          <a href={company.phoneHref} className="btn btn-line"><Phone className="h-4 w-4" /> Call {company.phoneDisplay}</a>
        </div>
      )}
      {onReset && (
        <button type="button" onClick={onReset} className="mt-6 text-sm font-semibold text-electric">
          {state.status === 'sent' ? 'Send another' : state.status === 'error' ? 'Back to the form' : 'Edit details'}
        </button>
      )}
    </m.div>
  )
}
