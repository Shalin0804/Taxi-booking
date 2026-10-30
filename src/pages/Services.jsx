import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Seo from '../components/Seo'
import ServiceCard from '../components/ServiceCard'
import { CitiesBand, WhyChoose } from '../components/sections'
import { Page, PageHero } from '../components/ui'
import { services } from '../data/site'

export default function Services() {
  return (
    <Page>
      <Seo path="/services" />
      <PageHero image="highway" title="Services for every journey."
        lede="Airport and station transfers, outstation trips, city rentals and employee transport, all with professional drivers and 24/7 support.">
        <Link to="/book" className="btn btn-gold">Book your ride <ArrowRight className="h-4 w-4" /></Link>
      </PageHero>
      <section className="py-24 sm:py-32" aria-labelledby="all-services">
        <h2 id="all-services" className="sr-only">All services</h2>
        <div className="wrap grid gap-5 md:grid-cols-2 lg:grid-cols-3" data-stagger>
          {services.map((s, i) => (
            <ServiceCard key={s.slug} s={s} className={i === 0 ? 'lg:col-span-2' : ''} />
          ))}
        </div>
      </section>
      <WhyChoose />
      <CitiesBand />
    </Page>
  )
}
