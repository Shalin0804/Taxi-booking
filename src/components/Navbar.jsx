import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { ChevronDown, Menu, X, Phone, ArrowUpRight, CircleUser } from 'lucide-react'
import Logo from './Logo'
import { services, company } from '../data/site'
import { EASE, getLenis } from '../lib/motion'
import { useAuth } from '../lib/auth'

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services', menu: true },
  { to: '/fleet', label: 'Our Fleet' },
  { to: '/corporate', label: 'Corporate Travel' },
  { to: '/contact', label: 'Contact' },
]

const serviceHref = (s) => s.href || `/services/${s.slug}`

export default function Navbar() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [drop, setDrop] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false); setDrop(false) }, [pathname])

  useEffect(() => {
    const l = getLenis()
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) l?.stop()
    else l?.start()
    const onKey = (e) => e.key === 'Escape' && (setOpen(false), setDrop(false))
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const solid = scrolled || open
  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-50 text-white transition-[background-color,box-shadow,padding] duration-500 ${
        solid ? 'bg-midnight/85 py-3 shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl' : 'bg-transparent py-5'
      }`}
    >
      <nav className="wrap flex items-center justify-between gap-6" aria-label="Main">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) =>
            l.menu ? (
              <li key={l.to} className="relative" onMouseEnter={() => setDrop(true)} onMouseLeave={() => setDrop(false)}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) => `nav-item flex items-center gap-1 ${isActive ? 'is-active' : ''}`}
                  aria-haspopup="true"
                  aria-expanded={drop}
                  onFocus={() => setDrop(true)}
                >
                  {l.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${drop ? 'rotate-180' : ''}`} />
                </NavLink>
                <AnimatePresence>
                  {drop && (
                    <m.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="absolute left-1/2 top-full w-[22rem] -translate-x-1/2 pt-4"
                      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setDrop(false)}
                    >
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy/95 p-2 shadow-2xl backdrop-blur-xl">
                        {services.map((s, i) => (
                          <m.div key={s.slug} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.04 * i, duration: 0.35, ease: EASE }}>
                            <Link to={serviceHref(s)} className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.06]">
                              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-gold transition-colors group-hover:bg-gold group-hover:text-midnight">
                                <s.icon className="h-4.5 w-4.5" />
                              </span>
                              <span>
                                <span className="block text-[0.95rem] font-semibold">{s.title}</span>
                                <span className="block text-[0.82rem] leading-snug text-white/55">{s.short}</span>
                              </span>
                            </Link>
                          </m.div>
                        ))}
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </li>
            ) : (
              <li key={l.to}>
                <NavLink to={l.to} end className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}>
                  {l.label}
                </NavLink>
              </li>
            ),
          )}
        </ul>

        <div className="flex items-center gap-3">
          <a href={company.phoneHref} className="hidden items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white xl:flex">
            <Phone className="h-4 w-4 text-gold" /> {company.phoneDisplay}
          </a>
          <Link to={user ? '/account' : '/login'} className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white lg:flex">
            <CircleUser className="h-4.5 w-4.5" /> {user ? user.name.split(' ')[0] : 'Sign in'}
          </Link>
          <Link to="/book" className="btn btn-gold hidden !px-5 !py-2.5 sm:inline-flex">Book Now</Link>
          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-white/20 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

    </header>
    {/* Outside <header>: its backdrop-filter would make it the containing block for this fixed panel. */}
    <AnimatePresence>
      {open && (
        <m.div
          id="mobile-menu"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed inset-x-0 bottom-0 top-[68px] z-40 overflow-y-auto bg-midnight text-white lg:hidden"
        >
          <div className="wrap flex min-h-full flex-col pb-10 pt-6">
            <ul>
              {links.map((l, i) => (
                <m.li key={l.to} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05, duration: 0.6, ease: EASE }}
                  className="border-b border-white/[0.08]">
                  <NavLink to={l.to} end className={({ isActive }) =>
                    `flex items-center justify-between py-4 text-[1.75rem] font-semibold tracking-tight ${isActive ? 'text-gold' : ''}`}>
                    {l.label} <ArrowUpRight className="h-5 w-5 opacity-40" />
                  </NavLink>
                  {l.menu && (
                    <div className="-mt-1 flex flex-wrap gap-2 pb-4">
                      {services.map((s) => (
                        <Link key={s.slug} to={serviceHref(s)} className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-white/75">
                          {s.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </m.li>
              ))}
            </ul>
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-auto grid gap-3 pt-10">
              <Link to="/book" className="btn btn-gold w-full">Book your ride</Link>
              <Link to={user ? '/account' : '/login'} className="btn btn-ghost w-full"><CircleUser className="h-4 w-4" /> {user ? 'My account' : 'Sign in or create account'}</Link>
              <a href={company.phoneHref} className="btn btn-ghost w-full"><Phone className="h-4 w-4" /> Call {company.phoneDisplay}</a>
            </m.div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
    </>
  )
}
