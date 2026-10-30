// Shared admin building blocks: toasts, modal, page header, table, async data hook.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { CircleAlert, CircleCheck, LoaderCircle, X } from 'lucide-react'
import { request } from '../lib/api'
import { EASE } from '../lib/motion'

const ToastCtx = createContext(() => {})
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] grid gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <m.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.35, ease: EASE }}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${t.tone === 'error' ? 'bg-red-600' : 'bg-midnight'}`}>
              {t.tone === 'error' ? <CircleAlert className="h-4 w-4" /> : <CircleCheck className="h-4 w-4 text-gold" />}
              {t.message}
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

/** Loads `path` and exposes { data, error, loading, reload }. */
// eslint-disable-next-line react-refresh/only-export-components
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true }))
    request(path)
      .then((data) => live && setState({ data, error: '', loading: false }))
      .catch((e) => live && setState({ data: null, error: e.message, loading: false }))
    return () => { live = false }
  }, [path, tick])
  return { ...state, reload: () => setTick((t) => t + 1) }
}

export function PageHeader({ title, sub, children }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <m.div className="fixed inset-0 z-[70] flex items-end justify-center bg-midnight/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <m.div role="dialog" aria-modal="true" aria-label={title} data-lenis-prevent
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}
            className={`max-h-[92svh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">{title}</h2>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-mist" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

/** Table that becomes stacked cards below 768px. columns: [{ key, label, render?, className? }] */
export function DataTable({ columns, rows, loading, error, empty = 'Nothing here yet.', onRowClick }) {
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>
  if (loading && !rows) return <div className="grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-mist" />)}</div>
  if (!rows?.length) return <p className="rounded-2xl border border-dashed border-line p-10 text-center text-slate">{empty}</p>
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key] ?? '—')
  return (
    <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist text-xs font-semibold text-slate">
            <tr>{columns.map((c) => <th key={c.key} scope="col" className={`whitespace-nowrap px-4 py-3 ${c.className || ''}`}>{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id ?? r.reference} onClick={onRowClick && (() => onRowClick(r))}
                className={onRowClick ? 'cursor-pointer transition-colors hover:bg-mist/70' : ''}>
                {columns.map((c) => <td key={c.key} className={`px-4 py-3.5 align-top ${c.className || ''}`}>{cell(c, r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id ?? r.reference}>
            <button type="button" onClick={onRowClick && (() => onRowClick(r))} disabled={!onRowClick}
              className="w-full rounded-2xl border border-line bg-white p-4 text-left disabled:cursor-default">
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                {columns.map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="text-slate">{c.label}</dt>
                    <dd className="min-w-0 break-words">{cell(c, r)}</dd>
                  </div>
                ))}
              </dl>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Spinner() {
  return <LoaderCircle className="h-4 w-4 animate-spin" />
}

export const inr = (n) => (n === null || n === undefined || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN')}`)
export const date = (d) => (d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
