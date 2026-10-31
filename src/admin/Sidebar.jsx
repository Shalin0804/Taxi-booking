import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronUp, LogOut } from 'lucide-react'
import Logo from '../components/Logo'
import { roleLabel, useAdmin } from './adminAuth'
import { ADMIN_BASE } from './base'
import { request } from '../lib/api'

const GROUPS = ['Overview', 'Operations', 'Fleet & pricing', 'Administration']
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

/** Admin sidebar: grouped links, a live pending-bookings badge, and scroll buttons when the menu overflows. */
export default function Sidebar({ items }) {
  const { user, logout, can } = useAdmin()
  const { pathname } = useLocation()
  const navRef = useRef(null)
  const [edges, setEdges] = useState({ up: false, down: false })
  const [pending, setPending] = useState(0)

  const measure = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setEdges({ up: el.scrollTop > 4, down: el.scrollTop + el.clientHeight < el.scrollHeight - 4 })
  }, [])

  useEffect(() => {
    const el = navRef.current
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', measure); ro.disconnect() }
  }, [measure])

  // Keep the active link in view, e.g. after navigating from a dashboard card.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  useEffect(() => {
    if (!can('stats:read')) return
    request('/api/admin/stats').then((d) => setPending(d.counts.pending)).catch(() => {})
  }, [pathname, can])

  const scroll = (dir) => navRef.current?.scrollBy({ top: dir * 180, behavior: 'smooth' })

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-[#0d1f36] via-midnight to-[#050d19] text-white">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />

      <div className="relative flex items-center justify-between px-5 pb-5 pt-6">
        <Logo />
        <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">Admin</span>
      </div>

      <div className="relative min-h-0 flex-1">
        <ScrollButton dir="up" show={edges.up} onClick={() => scroll(-1)} />
        <nav ref={navRef} data-lenis-prevent aria-label="Admin"
          className="h-full overflow-y-auto px-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {GROUPS.map((g) => {
            const links = items.filter((x) => x.group === g)
            if (!links.length) return null
            return (
              <div key={g} className="mt-5 first:mt-1">
                <p className="mb-2 px-3 text-[11px] font-semibold text-white/35">{g}</p>
                <ul className="grid gap-1">
                  {links.map((n) => (
                    <li key={n.path}>
                      <NavLink to={`${ADMIN_BASE}/${n.path}`}
                        className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-[0.92rem] font-medium transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-gold/20 to-gold/[0.03] text-white shadow-[inset_0_0_0_1px_rgb(200_169_107/0.25)]'
                            : 'text-white/65 hover:translate-x-0.5 hover:bg-white/[0.05] hover:text-white'}`}>
                        {({ isActive }) => (
                          <>
                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all duration-300 ${
                              isActive ? 'bg-gold text-midnight shadow-[0_6px_20px_-6px_rgb(200_169_107/0.8)]' : 'bg-white/[0.06] text-white/70 group-hover:bg-white/10 group-hover:text-gold'}`}>
                              <n.icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{n.label}</span>
                            {n.path === 'bookings' && pending > 0 && (
                              <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-midnight" title={`${pending} pending`}>{pending}</span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>
        <ScrollButton dir="down" show={edges.down} onClick={() => scroll(1)} />
      </div>

      <div className="relative m-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold to-[#a8884a] text-sm font-bold text-midnight">{initials(user.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-white/45">{user.email}</p>
          </div>
          <button onClick={logout} aria-label="Sign out" title="Sign out"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/60 transition-colors hover:bg-red-500/15 hover:text-red-300">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2.5 inline-block rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{roleLabel(user.role)}</p>
      </div>
    </div>
  )
}

function ScrollButton({ dir, show, onClick }) {
  const Icon = dir === 'up' ? ChevronUp : ChevronDown
  return (
    <div className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center transition-opacity duration-300 ${
      dir === 'up' ? 'top-0 bg-gradient-to-b from-midnight via-midnight/80 to-transparent pb-6' : 'bottom-0 bg-gradient-to-t from-midnight via-midnight/80 to-transparent pt-6'} ${show ? 'opacity-100' : 'opacity-0'}`}>
      <button type="button" onClick={onClick} tabIndex={show ? 0 : -1} aria-hidden={!show}
        aria-label={dir === 'up' ? 'Scroll menu up' : 'Scroll menu down'}
        className={`grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-[#0d1f36] text-gold shadow-lg transition-transform hover:scale-110 ${show ? 'pointer-events-auto' : ''}`}>
        <Icon className="h-4 w-4" />
      </button>
    </div>
  )
}
