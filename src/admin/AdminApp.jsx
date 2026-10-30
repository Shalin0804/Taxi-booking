import { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { Building2, CalendarDays, Car, Inbox, LayoutDashboard, LogOut, Menu, Tags, UserCog, Users, X, ExternalLink, UserRound } from 'lucide-react'
import Logo from '../components/Logo'
import { isStaff, useAuth } from '../lib/auth'
import { API_URL } from '../lib/api'
import { EASE } from '../lib/motion'
import { ToastProvider } from './kit'
import Overview from './Overview'
import Bookings from './Bookings'
import { Customers, Users as UsersPage } from './People'
import { Drivers, Pricing, Vehicles } from './Resources'
import Enquiries from './Enquiries'

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/vehicles', label: 'Vehicles', icon: Car },
  { to: '/admin/drivers', label: 'Drivers', icon: UserRound },
  { to: '/admin/pricing', label: 'Pricing', icon: Tags, admin: true },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { to: '/admin/users', label: 'Team & roles', icon: UserCog, admin: true },
]

export default function AdminApp() {
  const { user, ready, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => { document.title = 'Admin | TTT Cabs' }, [pathname])

  if (!API_URL) return <Notice title="API not connected" text="Set VITE_API_URL to the TTT Cabs API address to use the admin dashboard." />
  if (!ready) return <div className="min-h-screen bg-midnight" />
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />
  if (!isStaff(user)) return <Notice title="No admin access" text="This account doesn't have access to the admin dashboard." />

  const items = nav.filter((n) => !n.admin || user.role === 'admin')
  const sidebar = (
    <div className="flex h-full flex-col bg-midnight px-4 py-6 text-white">
      <div className="px-2"><Logo /></div>
      <p className="mt-2 px-2 text-xs text-white/45">Operations dashboard</p>
      <nav className="mt-8 grid gap-1" aria-label="Admin">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.93rem] font-medium transition-colors ${
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
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/5 hover:text-white"><ExternalLink className="h-4 w-4" /> View website</Link>
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/65 hover:bg-white/5 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</button>
        <p className="mt-2 truncate px-3 text-xs text-white/40">{user.email} · {user.role}</p>
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
              <Route index element={<Overview />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="customers" element={<Customers />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="drivers" element={<Drivers />} />
              <Route path="enquiries" element={<Enquiries />} />
              {user.role === 'admin' && <Route path="pricing" element={<Pricing />} />}
              {user.role === 'admin' && <Route path="users" element={<UsersPage me={user} />} />}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </m.main>
        </AnimatePresence>
      </div>
    </ToastProvider>
  )
}

function Notice({ title, text }) {
  return (
    <div className="grid min-h-screen place-items-center bg-midnight px-4 text-center text-white">
      <div>
        <Building2 className="mx-auto h-10 w-10 text-gold" />
        <h1 className="mt-5 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-white/65">{text}</p>
        <Link to="/" className="btn btn-gold mt-8">Back to website</Link>
      </div>
    </div>
  )
}
