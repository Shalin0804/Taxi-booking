import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Check, Phone } from 'lucide-react'
import Seo from '../components/Seo'
import ServiceCard from '../components/ServiceCard'
import FleetCarousel from '../components/FleetCarousel'
import { Page, PageHero, Picture, SectionHead } from '../components/ui'
import { company, detailServices, services, SITE_URL } from '../data/site'
import NotFound from './NotFound'


export default function ServiceDetail() {
  const { slug } = useParams()
  const s = detailServices.find((x) => x.slug === slug)
  if (!s) return <NotFound />
  const bookHref = `/book?trip=${encodeURIComponent(s.tripType)}`
  const others = services.filter((x) => x.slug !== s.slug).slice(0, 3)

  return (
    <Page>
      <Seo
        path={`/services/${s.slug}`}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          serviceType: s.title,
          name: `${s.title} by TTT Cabs`,
          description: s.intro,
          areaServed: 'IN',
          provider: { '@type': 'TaxiService', name: company.name, telephone: company.phoneDisplay, url: SITE_URL },
        }}
      />
      <PageHero image={s.hero} title={s.title} lede={s.short}>
        <Link to={bookHref} className="btn btn-gold">Book {s.title.toLowerCase()} <ArrowRight className="h-4 w-4" /></Link>
        <a href={company.phoneHref} className="btn btn-ghost"><Phone className="h-4 w-4" /> {company.phoneDisplay}</a>
      </PageHero>

      <section className="py-24 sm:py-32">
        <div className="wrap grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="text-[clamp(1.4rem,2.6vw,2.1rem)] font-medium leading-[1.3] tracking-[-0.02em]" data-reveal>{s.intro}</p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2" data-stagger>
              {s.points.map((p) => (
                <li key={p} data-reveal className="flex items-start gap-3 rounded-2xl bg-mist p-5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-gold"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                  <span className="text-[0.97rem]">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]" data-mask>
            <Picture name={s.side} alt="" sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-midnight py-24 text-white sm:py-32">
        <div className="wrap">
          <SectionHead light title="Pick your vehicle." lede="Tell us how many people and bags are travelling, and we'll confirm the right car." />
          <div data-reveal><FleetCarousel light /></div>
        </div>
      </section>

      <section className="py-24 sm:py-32">
        <div className="wrap">
          <SectionHead title="Other services" />
          <div className="grid gap-5 md:grid-cols-3" data-stagger>
            {others.map((o) => <ServiceCard key={o.slug} s={o} />)}
          </div>
        </div>
      </section>
    </Page>
  )
}
