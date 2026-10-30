import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MessageCircle, ArrowRight } from 'lucide-react'
import Logo from './Logo'
import { company, services, cities } from '../data/site'
import { useScrollFx } from '../lib/motion'

export const Instagram = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
)
export const Facebook = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M14 8.5V6.8c0-.8.5-1.3 1.3-1.3H17V2.3h-2.6C11.7 2.3 10.5 4 10.5 6.5v2H8v3.3h2.5v9.9H14v-9.9h2.6l.4-3.3H14Z" /></svg>
)

const quick = [
  ['About us', '/about'], ['Services', '/services'], ['Our fleet', '/fleet'],
  ['Corporate travel', '/corporate'], ['Contact', '/contact'], ['Book a ride', '/book'],
]

export default function Footer() {
  const ref = useRef(null)
  useScrollFx(ref)
  return (
    <footer ref={ref} className="relative overflow-hidden bg-midnight text-white">
      <div className="wrap border-b border-white/[0.08] py-16 sm:py-24" data-reveal>
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <h2 className="h2 max-w-3xl">Wherever the day takes you, we'll be waiting at the kerb.</h2>
          <div className="flex flex-wrap gap-3">
            <Link to="/book" className="btn btn-gold">Book your ride <ArrowRight className="h-4 w-4" /></Link>
            <a href={company.phoneHref} className="btn btn-ghost"><Phone className="h-4 w-4" /> Call us</a>
          </div>
        </div>
      </div>

      <div className="wrap grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr_1.3fr]" data-stagger>
        <div data-reveal>
          <Logo />
          <p className="mt-5 max-w-xs text-[0.95rem] text-white/60">
            {company.name} by {company.legalName}. Airport, railway, outstation, city and workplace travel across India.
          </p>
          <div className="mt-6 flex gap-2.5">
            <a href={company.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="TTT Cabs on Instagram"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition-colors hover:border-gold hover:text-gold">
              <Instagram className="h-4.5 w-4.5" />
            </a>
            <a href={company.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="TTT Cabs on Facebook"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition-colors hover:border-gold hover:text-gold">
              <Facebook className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>

        <FooterCol title="Company">
          {quick.map(([l, to]) => <li key={to}><Link to={to} className="link-u">{l}</Link></li>)}
        </FooterCol>

        <FooterCol title="Services">
          {services.map((s) => (
            <li key={s.slug}><Link to={s.href || `/services/${s.slug}`} className="link-u">{s.title}</Link></li>
          ))}
        </FooterCol>

        <FooterCol title="Get in touch">
          <li><a href={company.phoneHref} className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-gold" /><span className="link-u">{company.phoneDisplay}</span></a></li>
          <li><a href={`mailto:${company.email}`} className="flex items-center gap-2.5 break-all"><Mail className="h-4 w-4 shrink-0 text-gold" /><span className="link-u">{company.email}</span></a></li>
          <li><a href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5"><MessageCircle className="h-4 w-4 text-gold" /><span className="link-u">WhatsApp us</span></a></li>
          <li className="pt-2 text-sm text-white/45">Support available 24/7</li>
        </FooterCol>
      </div>

      <div className="wrap border-t border-white/[0.08] py-6">
        <p className="text-sm text-white/60">Car rentals in {cities.join(', ')}.</p>
        <p className="mt-3 text-sm text-white/60">© {new Date().getFullYear()} {company.legalName}. All rights reserved.</p>
      </div>
    </footer>
  )
}

function FooterCol({ title, children }) {
  return (
    <div data-reveal>
      <h3 className="mb-5 text-sm font-semibold tracking-normal text-gold">{title}</h3>
      <ul className="space-y-3 text-[0.95rem] text-white/75">{children}</ul>
    </div>
  )
}
