import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { BarChart3, Building2, CalendarDays, Car, Inbox, LayoutDashboard, Mail, Menu, Settings as SettingsIcon, ShieldOff, Tags, UserCog, UserRound, Users } from 'lucide-react'
import Logo from '../components/Logo'
import { AdminAuthProvider, useAdmin } from './adminAuth'
import Sidebar from './Sidebar'
import { ADMIN_BASE } from './base'
import { EASE } from '../lib/motion'
import { LoadingScreen } from '../components/Loading'
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
  { path: 'dashboard', group: 'Overview', label: 'Dashboard', icon: LayoutDashboard, perm: 'stats:read', el: <Overview /> },
  { path: 'bookings', group: 'Operations', label: 'Bookings', icon: CalendarDays, perm: 'bookings:read', el: <Bookings /> },
  { path: 'customers', group: 'Operations', label: 'Customers', icon: Users, perm: 'customers:read', el: <Customers /> },
  { path: 'drivers', group: 'Fleet & pricing', label: 'Drivers', icon: UserRound, perm: 'fleet:read', el: <Drivers /> },
  { path: 'vehicles', group: 'Fleet & pricing', label: 'Vehicles', icon: Car, perm: 'fleet:read', el: <Vehicles /> },
  { path: 'pricing', group: 'Fleet & pricing', label: 'Pricing', icon: Tags, perm: 'pricing:read', el: <Pricing /> },
  { path: 'corporate-enquiries', group: 'Operations', label: 'Corporate enquiries', icon: Building2, perm: 'enquiries:read', el: <Enquiries type="corporate" /> },
  { path: 'contact-enquiries', group: 'Operations', label: 'Contact enquiries', icon: Mail, perm: 'enquiries:read', el: <Enquiries type="contact" /> },
  { path: 'reports', group: 'Overview', label: 'Reports', icon: BarChart3, perm: 'reports:read', el: <Reports /> },
  { path: 'users', group: 'Administration', label: 'Team & roles', icon: UserCog, perm: 'users:manage', el: <Team /> },
  { path: 'settings', group: 'Administration', label: 'Settings', icon: SettingsIcon, perm: null, el: <Settings /> },
]

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Portal />
    </AdminAuthProvider>
  )
}

function Portal() {
  const { user, ready, can } = useAdmin()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => { document.title = 'Admin | TTT Cabs' }, [pathname])

  if (!ready) return <LoadingScreen />
  const sub = pathname.slice(ADMIN_BASE.length).replace(/^\/|\/$/g, '')
  // Signed out: the login lives at the base URL; any deeper admin URL redirects there.
  if (!user) return sub ? <Navigate to={ADMIN_BASE} replace /> : <AdminLogin />
  if (!sub) return <Navigate to={`${ADMIN_BASE}/${modules.find((x) => !x.perm || can(x.perm)).path}`} replace />

  const items = modules.filter((x) => !x.perm || can(x.perm))
  const sidebar = <Sidebar items={items} />

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#f7f8fb] lg:pl-64">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 shadow-[8px_0_40px_-20px_rgb(7_20_38/0.6)] lg:block">{sidebar}</aside>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo className="text-midnight" />
          <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-line" aria-label="Open admin menu"><Menu className="h-5 w-5" /></button>
        </header>
        <AnimatePresence>
          {open && (
            <>
              <m.div className="fixed inset-0 z-40 bg-midnight/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
              <m.aside className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.4, ease: EASE }}>
                <Sidebar items={items} onClose={() => setOpen(false)} />
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
