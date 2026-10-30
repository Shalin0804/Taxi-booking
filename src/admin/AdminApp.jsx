import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { BarChart3, Building2, CalendarDays, Car, Inbox, LayoutDashboard, LogOut, Mail, Menu, Settings as SettingsIcon, ShieldOff, Tags, UserCog, UserRound, Users, X } from 'lucide-react'
import Logo from '../components/Logo'
import { AdminAuthProvider, roleLabel, useAdmin } from './adminAuth'
import { ADMIN_BASE } from './base'
import { EASE } from '../lib/motion'
import { ToastProvider } from './kit'
import AdminLogin from './AdminLogin'
import Overview from './Overview'
import Bookings from './Bookings'
import { Customers, Team } from './People'
import { Drivers, Pricing, Vehicles } from './Resources'
import Enquiries from './Enquiries'
import Reports from './Reports'
import Settings from './Settings'

// Each module and the permission it needs. The server enforces the same permissions on its API.
const modules = [
  { path: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'stats:read', el: <Overview /> },
  { path: 'bookings', label: 'Bookings', icon: CalendarDays, perm: 'bookings:read', el: <Bookings /> },
  { path: 'customers', label: 'Customers', icon: Users, perm: 'customers:read', el: <Customers /> },
  { path: 'drivers', label: 'Drivers', icon: UserRound, perm: 'fleet:read', el: <Drivers /> },
  { path: 'vehicles', label: 'Vehicles', icon: Car, perm: 'fleet:read', el: <Vehicles /> },
  { path: 'pricing', label: 'Pricing', icon: Tags, perm: 'pricing:read', el: <Pricing /> },
  { path: 'corporate-enquiries', label: 'Corporate enquiries', icon: Building2, perm: 'enquiries:read', el: <Enquiries type="corporate" /> },
  { path: 'contact-enquiries', label: 'Contact enquiries', icon: Mail, perm: 'enquiries:read', el: <Enquiries type="contact" /> },
  { path: 'reports', label: 'Reports', icon: BarChart3, perm: 'reports:read', el: <Reports /> },
  { path: 'users', label: 'Team & roles', icon: UserCog, perm: 'users:manage', el: <Team /> },
  { path: 'settings', label: 'Settings', icon: SettingsIcon, perm: null, el: <Settings /> },
]

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Portal />
    </AdminAuthProvider>
  )
}

function Portal() {
  const { user, ready, logout, can } = useAdmin()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => { document.title = 'Admin | TTT Cabs' }, [pathname])

  if (!ready) return <div className="min-h-screen bg-[#050d19]" />
  const sub = pathname.slice(ADMIN_BASE.length).replace(/^\/|\/$/g, '')
  // Signed out: the login lives at the base URL; any deeper admin URL redirects there.
  if (!user) return sub ? <Navigate to={ADMIN_BASE} replace /> : <AdminLogin />
  if (!sub) return <Navigate to={`${ADMIN_BASE}/${modules.find((x) => !x.perm || can(x.perm)).path}`} replace />

  const items = modules.filter((x) => !x.perm || can(x.perm))
  const sidebar = (
    <div className="flex h-full flex-col bg-midnight px-4 py-6 text-white">
      <div className="px-2"><Logo /></div>
      <p className="mt-2 px-2 text-xs text-white/45">Administration</p>
      <nav className="mt-7 grid gap-0.5 overflow-y-auto" aria-label="Admin">
        {items.map((n) => (
          <NavLink key={n.path} to={`${ADMIN_BASE}/${n.path}`}
            className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] font-medium transition-colors ${
              isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gold" />}
                <n.icon className={`h-[18px] w-[18px] ${isActive ? 'text-gold' : ''}`} /> {n.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto grid gap-1 border-t border-white/10 pt-4">
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/65 hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</button>
        <p className="mt-2 truncate px-3 text-xs text-white/40">{user.email}</p>
        <p className="px-3 text-xs text-gold/80">{roleLabel(user.role)}</p>
      </div>
    </div>
  )

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f7f8fb] lg:pl-64">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo className="text-midnight" />
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-line" aria-label="Open admin menu"><Menu className="h-5 w-5" /></button>
        </header>
        <AnimatePresence>
          {open && (
            <>
              <m.div className="fixed inset-0 z-40 bg-midnight/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
              <m.aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.4, ease: EASE }}>
                <button onClick={() => setOpen(false)} className="absolute right-3 top-5 z-10 grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/10" aria-label="Close admin menu"><X className="h-5 w-5" /></button>
                {sidebar}
              </m.aside>
            </>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <m.main key={pathname} id="main" className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <Routes>
              {modules.map((x) => (
                <Route key={x.path} path={`${ADMIN_BASE}/${x.path}`} element={!x.perm || can(x.perm) ? x.el : <NoAccess />} />
              ))}
              <Route path="*" element={<NotFoundPanel />} />
            </Routes>
          </m.main>
        </AnimatePresence>
      </div>
    </ToastProvider>
  )
}

function NoAccess() {
  return (
    <div className="grid place-items-center rounded-3xl bg-white p-12 text-center ring-1 ring-line">
      <ShieldOff className="h-10 w-10 text-slate" />
      <h1 className="mt-4 text-2xl font-semibold">You don't have access to this section</h1>
      <p className="mt-2 text-slate">Ask a super admin if your role should include it.</p>
    </div>
  )
}

function NotFoundPanel() {
  return (
    <div className="grid place-items-center rounded-3xl bg-white p-12 text-center ring-1 ring-line">
      <Inbox className="h-10 w-10 text-slate" />
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-slate">Use the menu to choose a section.</p>
    </div>
  )
}
