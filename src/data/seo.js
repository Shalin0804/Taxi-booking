// Single source for page meta. Used by <Seo> at runtime and by scripts/prerender-meta.js
// at build time, so link previews get the right title without running JS.
import { company, detailServices } from './site.js'

const home = {
  title: 'TTT Cabs | Airport, Outstation & Corporate Cab Service in India',
  description: 'Book airport transfers, railway station cabs, outstation trips, city car rentals and employee transportation with TTT Cabs. Professional drivers and 24/7 support.',
}

export const pageMeta = {
  '/': home,
  '/about': {
    title: 'About Us',
    description: `${company.name} is run by ${company.legalName}: a customer-first cab service for airport, railway, outstation, city and workplace travel.`,
    image: '/images/sealink-1400.webp',
  },
  '/services': {
    title: 'Cab Services',
    description: 'Airport transfers, railway station cabs, outstation travel, city car rentals and workplace commute services from TTT Cabs.',
    image: '/images/highway-1400.webp',
  },
  '/fleet': {
    title: 'Our Fleet',
    description: 'TTT Cabs fleet: sedans, SUVs, luxury vehicles and vans for solo travellers through to large groups. Well maintained and regularly inspected.',
    image: '/images/luxury-1400.webp',
  },
  '/corporate': {
    title: 'Corporate & Employee Transportation',
    description: 'Employee transportation, workplace commute and corporate travel from TTT Cabs. Structured commute programmes and business rentals with 24/7 support.',
    image: '/images/handshake-1400.webp',
  },
  '/contact': {
    title: 'Contact Us',
    description: `Contact TTT Cabs on ${company.phoneDisplay} or ${company.email}. Support is available 24/7 for bookings and enquiries.`,
    image: '/images/city-1400.webp',
  },
  '/login': { title: 'Sign in', description: 'Sign in to your TTT Cabs account to track your bookings.' },
  '/signup': { title: 'Create an account', description: 'Create a TTT Cabs account to book faster and track every trip.' },
  '/account': { title: 'My account', description: 'Your TTT Cabs bookings and their status.' },
  '/book': {
    title: 'Book a Ride',
    description: 'Book a TTT Cabs ride in a few steps: airport, railway, hourly rental or outstation. Choose your vehicle and our team confirms your booking.',
  },
  ...Object.fromEntries(detailServices.map((s) => [`/services/${s.slug}`, {
    title: s.title,
    description: `${s.short} Book ${s.title.toLowerCase()} with TTT Cabs: professional drivers, transparent fares and 24/7 support.`,
    image: `/images/${s.hero}-1400.webp`,
  }])),
}

export const fullTitle = (path, title) => (path === '/' ? title : `${title} | TTT Cabs`)
