import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { advantages, cities } from '../data/site'
import { Picture, SectionHead } from './ui'

export function WhyChoose() {
  return (
    <section className="bg-mist py-24 sm:py-32">
      <div className="wrap">
        <SectionHead
          title="The details that make a ride feel effortless."
          lede="What every TTT Cabs journey comes with, whether it is a 6 am airport run or a week on the road."
        />
        <div className="grid gap-px overflow-hidden rounded-[1.5rem] bg-line sm:grid-cols-2 lg:grid-cols-3" data-stagger>
          {advantages.map((a) => (
            <div key={a.title} data-reveal className="group bg-white p-8 transition-colors duration-500 hover:bg-midnight sm:p-10">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-mist text-navy transition-all duration-500 group-hover:bg-gold group-hover:text-midnight">
                <a.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-7 text-xl font-semibold tracking-tight transition-colors duration-500 group-hover:text-white">{a.title}</h3>
              <p className="mt-3 text-[0.97rem] text-slate transition-colors duration-500 group-hover:text-white/65">{a.text}</p>
            </div>
          ))}
        </div>

        {/* Only figures published on the live site. */}
        <dl className="mt-16 grid grid-cols-2 gap-8 border-t border-line pt-12 md:grid-cols-4" data-stagger>
          <Stat value={cities.length} counter label="Cities with car rentals" />
          <Stat value="24/7" label="Customer support" />
          <Stat value={4} counter label="Fare options: hourly, one-way, round trip, custom" />
          <Stat value={4} counter label="Vehicle categories, sedans to vans" />
        </dl>
      </div>
    </section>
  )
}

function Stat({ value, label, counter }) {
  return (
    <div data-reveal className="flex flex-col-reverse justify-end">
      <dt className="mt-3 max-w-[14rem] text-sm text-slate">{label}</dt>
      <dd className="text-[clamp(2.6rem,5vw,4rem)] font-semibold leading-none tracking-[-0.04em] text-navy">
        <span data-counter={counter ? value : undefined}>{value}</span>
      </dd>
    </div>
  )
}

export function CorporateBand() {
  return (
    <section className="relative overflow-hidden bg-navy py-24 text-white sm:py-32">
      <div className="wrap grid items-center gap-14 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] sm:aspect-[5/4] lg:aspect-[4/5]" data-mask>
          <Picture name="corporate" alt="Modern open-plan office" sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full object-cover" />
        </div>
        <div>
          <h2 className="h2" data-reveal>Need wheels for your employees?</h2>
          <p className="lede mt-6 text-white/70" data-reveal>
            Structured, well-managed commute facilities that improve your employees' day, with business rentals and
            office commute services for teams of any size.
          </p>
          <ul className="mt-9 grid gap-4" data-stagger>
            {['Employee transportation and workplace commute', 'Business rentals for meetings and client visits', 'One point of contact, available 24/7'].map((t) => (
              <li key={t} data-reveal className="flex items-start gap-3.5">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold text-midnight"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                <span className="text-white/85">{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3" data-reveal>
            <Link to="/corporate" className="btn btn-gold">Explore corporate travel <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/corporate#enquiry" className="btn btn-ghost">Request a proposal</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export function CitiesBand() {
  return (
    <section className="py-24 sm:py-28">
      <div className="wrap">
        <SectionHead title="Car rentals across India." lede="Book a chauffeur-driven car in any of these cities." />
        <ul className="flex flex-wrap gap-3" data-stagger>
          {cities.map((c) => (
            <li key={c} data-reveal>
              <Link to={`/book?pickup=${encodeURIComponent(c)}&trip=${encodeURIComponent('Hourly rental')}`}
                className="group inline-flex items-center gap-3 rounded-full border border-line py-3 pl-6 pr-3 text-lg font-medium transition-all duration-500 hover:border-midnight hover:bg-midnight hover:text-white">
                {c}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-mist text-navy transition-all duration-500 group-hover:bg-gold">
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-rotate-45" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
