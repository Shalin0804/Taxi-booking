import { Link } from 'react-router-dom'
import { ArrowRight, Phone } from 'lucide-react'
import Seo from '../components/Seo'
import FleetCarousel from '../components/FleetCarousel'
import { Page, PageHero, Picture, SectionHead } from '../components/ui'
import { company, fleet } from '../data/site'

export default function Fleet() {
  return (
    <Page>
      <Seo path="/fleet" />
      <PageHero image="luxury" title="A car for every kind of trip."
        lede="Sedans, SUVs, luxury vehicles, vans and specialty options, in seating capacities from solo travellers to large groups.">
        <Link to="/book" className="btn btn-gold">Book a vehicle <ArrowRight className="h-4 w-4" /></Link>
      </PageHero>

      <section className="overflow-hidden py-24 sm:py-32">
        <div className="wrap">
          <SectionHead title="Browse by category." lede="Swipe or use the arrows. Tell us your group size and luggage, and we'll confirm the right vehicle." />
          <div data-reveal><FleetCarousel /></div>
        </div>
      </section>

      <section className="bg-mist py-24 sm:py-32">
        <div className="wrap grid gap-16">
          {fleet.map((v, i) => (
            <article key={v.name} className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-20 ${i % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
              <div className="aspect-[16/10] overflow-hidden rounded-[1.5rem]" data-mask>
                <Picture name={v.image} alt={`${v.name} vehicle`} sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full object-cover" />
              </div>
              <div data-reveal>
                <h2 className="h2">{v.name}</h2>
                {v.models && (
                  <p className="mt-2 text-sm font-semibold tracking-wide text-gold-dark">
                    Typical models: {v.models}
                  </p>
                )}
                <p className="lede mt-4 text-slate">{v.use}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to={`/book?vehicle=${encodeURIComponent(v.name)}`} className="btn btn-navy">Book {v.name.split(' ')[0]} <ArrowRight className="h-4 w-4" /></Link>
                  <a href={company.phoneHref} className="btn btn-line"><Phone className="h-4 w-4" /> Ask about models</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="wrap max-w-3xl text-center" data-reveal>
          <p className="text-slate">
            Every vehicle has routine inspections and safety-feature testing. Any vehicle with a concern is taken out of
            service. Exact models, seats and luggage space depend on availability in your city, and our team confirms
            them when you book.
          </p>
        </div>
      </section>
    </Page>
  )
}
