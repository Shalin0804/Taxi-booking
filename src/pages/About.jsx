import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Seo from '../components/Seo'
import { CitiesBand, WhyChoose } from '../components/sections'
import { Page, PageHero, Picture } from '../components/ui'
import { company } from '../data/site'

// Values copied from the live About page.
const values = [
  { title: 'Customer-centric', text: 'Your satisfaction is our top priority. We listen, understand and deliver travel that exceeds your expectations.' },
  { title: 'Integrity and transparency', text: 'Honest, transparent dealings. No hidden costs, no surprises, just straightforward, reliable service.' },
  { title: 'Innovation and excellence', text: 'We keep looking for better ways to improve your journey, and aim for excellence in everything we do.' },
  { title: 'Sustainable travel', text: 'We are committed to sustainable travel practices that preserve the places we travel through.' },
]

export default function About() {
  return (
    <Page>
      <Seo path="/about" />
      <PageHero image="sealink" title="Every journey is a story."
        lede={`${company.name} is the cab service of ${company.legalName}, built on one idea: make every ride safe, punctual and comfortable.`} />

      <section className="py-24 sm:py-32">
        <div className="wrap grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
          <div>
            <p className="text-[clamp(1.5rem,2.8vw,2.3rem)] font-medium leading-[1.25] tracking-[-0.025em]" data-reveal>
              We are a team committed to turning your travel plans into smooth, stress-free journeys.
            </p>
            <p className="mt-8 max-w-xl text-slate" data-reveal>
              From airport and railway transfers to outstation trips, city rentals and employee transportation, we provide
              travel solutions tailored to what you need. Our drivers are background-verified and trained, our vehicles are
              routinely inspected, and our support team is available 24/7.
            </p>
            <Link to="/services" className="btn btn-navy mt-10" data-reveal>Our services <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="aspect-[4/5] overflow-hidden rounded-[1.5rem]" data-mask>
            <Picture name="interior" alt="Maruti Suzuki Brezza parked by a forest road in Khandala, Maharashtra" sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="bg-midnight py-24 text-white sm:py-32">
        <div className="wrap">
          <h2 className="h2 max-w-2xl" data-reveal>What we stand for.</h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[1.5rem] bg-white/10 md:grid-cols-2" data-stagger>
            {values.map((v) => (
              <div key={v.title} data-reveal className="bg-midnight p-8 sm:p-10">
                <span className="block h-px w-10 bg-gold" aria-hidden="true" />
                <h3 className="mt-6 text-2xl font-semibold">{v.title}</h3>
                <p className="mt-3 text-white/65">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhyChoose />
      <CitiesBand />
    </Page>
  )
}
