// Every fact here was taken from the live site (tttcabs.com, audited 2026-10-30).
// Do not add services, vehicles, numbers or contact details that aren't published there.
import { Plane, TrainFront, Route, KeyRound, Building2, BadgeCheck, Clock, ShieldCheck, Wallet, Headset, CarFront } from 'lucide-react'

export const SITE_URL = 'https://tttcabs.com'

export const company = {
  name: 'TTT Cabs',
  legalName: 'Tahshildar Tour & Travels',
  phone: '9545961788',
  phoneDisplay: '+91 95459 61788',
  phoneHref: 'tel:+919545961788',
  email: 'ftashildar3705@gmail.com',
  whatsapp: '919545961788',
  socials: {
    instagram: 'https://www.instagram.com/tttcabs',
    facebook: 'https://www.facebook.com/profile.php?id=100054412830284',
  },
}

export const cities = [
  'Delhi', 'Mumbai', 'Pune', 'Hyderabad', 'Bangalore', 'Chennai',
  'Chandigarh', 'Ahmedabad', 'Guwahati', 'Jaipur', 'Kolkata',
]

export const img = (name, w = 1400) => `/images/${name}-${w}.webp`
export const srcSet = (name) => `/images/${name}-800.webp 800w, /images/${name}-1400.webp 1400w`

export const services = [
  {
    slug: 'airport-transfers',
    hero: 'traveler',
    side: 'airport',
    title: 'Airport transfers',
    short: 'Pickups and drops to and from the airport, with a driver waiting when you land.',
    icon: Plane,
    image: 'airport',
    intro:
      'Hassle-free transfers to and from the airport. Whether you need an airport pickup or drop-off, our professional drivers will be there to assist you, so you reach your destination safely and on time.',
    points: [
      'Airport pickups and drop-offs',
      'Drivers trained to arrive ahead of time',
      'Delay updates shared with you directly',
      'Clear fares with no hidden fees',
    ],
    tripType: 'Airport transfer',
  },
  {
    slug: 'railway-transfers',
    hero: 'railway',
    side: 'railside',
    title: 'Railway station transfers',
    short: 'Swift, dependable pickups and drops at the railway station.',
    icon: TrainFront,
    image: 'railway',
    intro:
      'Swift and dependable railway station cab services. Our experienced drivers ensure a safe and comfortable journey, and our streamlined booking makes station travel stress-free.',
    points: [
      'Station pick-up and drop',
      'Experienced, background-verified drivers',
      'Well-maintained vehicles',
      'Support available day and night',
    ],
    tripType: 'Railway transfer',
  },
  {
    slug: 'outstation-travel',
    hero: 'outstation',
    side: 'fog',
    title: 'Outstation travel',
    short: 'Weekend getaways, business trips and family vacations, one-way or round trip.',
    icon: Route,
    image: 'outstation',
    intro:
      'Whether you are planning a weekend getaway, a business trip or a family vacation, our reliable and comfortable cabs make it a smooth journey. Well-maintained vehicles, driven by professional and experienced drivers, take you to your destination safely and efficiently.',
    points: [
      'One-way and round trips',
      'Professional drivers with local knowledge',
      'Sedans, SUVs, luxury vehicles and vans',
      'Customised plans for longer journeys',
    ],
    tripType: 'Outstation one-way',
  },
  {
    slug: 'car-rentals',
    hero: 'city',
    side: 'chauffeur',
    title: 'City car rentals',
    short: 'Hourly and custom rentals in eleven Indian cities, from Delhi to Kolkata.',
    icon: KeyRound,
    image: 'city',
    intro:
      'Chauffeur-driven car rentals across the cities we serve, with flexible fares: hourly rates, one-way trips, round trips and customised plans for your budget.',
    points: [
      'Hourly rates and custom plans',
      `Available in ${cities.length} cities`,
      'Vehicles for solo travellers to large groups',
      'Clear fares, communicated up front',
    ],
    tripType: 'Hourly rental',
  },
  {
    slug: 'corporate',
    title: 'Workplace commute',
    short: 'Structured employee transportation and business rentals for your organisation.',
    icon: Building2,
    image: 'corporate',
    href: '/corporate',
    tripType: 'Corporate / custom',
  },
]

export const detailServices = services.filter((s) => !s.href)

// Categories named on the live site. No models or capacities are published,
// so those are confirmed by the team at booking time rather than shown here.
export const fleet = [
  {
    name: 'Sedan',
    models: 'Maruti Suzuki Dzire, Toyota Etios, Honda City',
    image: 'sedan',
    use: 'Airport runs, station transfers and everyday city travel.',
  },
  {
    name: 'SUV',
    models: 'Toyota Innova Crysta, Toyota HyCross, Maruti Ertiga',
    image: 'suv',
    use: 'Families, extra luggage and long outstation drives.',
  },
  {
    name: 'Luxury',
    models: 'Mercedes-Benz E-Class, BMW 5 Series, Toyota Camry Hybrid',
    image: 'luxury',
    use: 'Business travel, executives and special occasions.',
  },
  {
    name: 'Vans & group vehicles',
    models: 'Force Tempo Traveller (12–17 seater), Force Urbania',
    image: 'group',
    use: 'Group travel and employee transport, from small teams to large groups.',
  },
]

export const tripTypes = [
  'Airport transfer',
  'Railway transfer',
  'Hourly rental',
  'Outstation one-way',
  'Outstation round trip',
  'Corporate / custom',
]

export const vehicleOptions = [...fleet.map((f) => f.name), 'No preference']

// "Why choose us" points, condensed from the live site's own copy.
export const advantages = [
  { title: 'Professional chauffeurs', text: 'Drivers go through a stringent selection process and background verification, with continuous training in defensive driving and customer service.', icon: BadgeCheck },
  { title: 'On time, every time', text: 'Drivers are trained to arrive ahead of time. Routes are planned for efficient pickups, and if there is ever a delay, your driver tells you the new arrival time.', icon: Clock },
  { title: 'Safety measures', text: 'Drivers maintain clean records. Vehicles have routine inspections and safety-feature testing, and any vehicle with a concern is taken out of service.', icon: ShieldCheck },
  { title: 'Transparent fares', text: 'Rates are communicated clearly with no hidden fees, across hourly, one-way, round-trip and customised plans.', icon: Wallet },
  { title: 'Support around the clock', text: 'A dedicated customer support team is available 24/7 by phone, email and chat.', icon: Headset },
  { title: 'A vehicle for every trip', text: 'Sedans, SUVs, luxury vehicles and vans, for solo travellers through to large groups.', icon: CarFront },
]
