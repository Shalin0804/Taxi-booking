import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ArrowRight } from 'lucide-react'
import Seo from '../components/Seo'
import BookingWidget from '../components/BookingWidget'
import ServiceCard from '../components/ServiceCard'
import FleetCarousel from '../components/FleetCarousel'
import { CitiesBand, CorporateBand, WhyChoose } from '../components/sections'
import { Page, Picture, SectionHead, SplitWords } from '../components/ui'
import { services } from '../data/site'
import { reducedMotion } from '../lib/motion'

export default function Home() {
  return (
    <Page>
      <Seo path="/" />
      <Hero />
      <Intro />

      <section className="pb-24 sm:pb-32" aria-labelledby="services-h">
        <div className="wrap">
          <SectionHead
            title={<span id="services-h">Every kind of journey, handled.</span>}
            lede="From a single airport drop to a daily commute for your whole team."
            action={<Link to="/services" className="btn btn-line">All services <ArrowRight className="h-4 w-4" /></Link>}
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-6" data-stagger>
            {services.map((s, i) => (
              <ServiceCard key={s.slug} s={s}
                className={i < 2 ? 'lg:col-span-3 lg:min-h-[34rem]' : 'lg:col-span-2'}
                sizes={i < 2 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 33vw, 100vw'} />
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-midnight py-24 text-white sm:py-32" aria-labelledby="fleet-h">
        <div className="wrap">
          <SectionHead light
            title={<span id="fleet-h">Choose the car that suits the trip.</span>}
            lede="Sedans, SUVs, luxury vehicles and vans. Every vehicle is well maintained and inspected regularly."
            action={<Link to="/fleet" className="btn btn-ghost">View the fleet <ArrowRight className="h-4 w-4" /></Link>}
          />
          <div data-reveal><FleetCarousel light /></div>
        </div>
      </section>

      <CorporateBand />
      <WhyChoose />
      <CitiesBand />
    </Page>
  )
}

function Hero() {
  const ref = useRef(null)
  useEffect(() => {
    if (reducedMotion()) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.fromTo('.hero-veil', { opacity: 1 }, { opacity: 0, duration: 1, ease: 'power2.inOut' })
        .from('.hero-img', { scale: 1.22, duration: 2.8, ease: 'power3.out' }, 0)
        .from('.hero-line', { scaleX: 0, duration: 1.4, ease: 'expo.inOut' }, 0.1)
        .from('.split-word', { yPercent: 118, rotate: 4, duration: 1.3, stagger: 0.08 }, 0.15)
        .from('.hero-fade', { opacity: 0, y: 24, duration: 1.2, stagger: 0.12 }, 0.6)
        .from('.hero-widget', { opacity: 0, x: 40, filter: 'blur(10px)', duration: 1.3 }, 0.6)
      // Parallax: image drifts and content lifts away as the hero scrolls out.
      gsap.to('.hero-media', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('.hero-copy', { yPercent: -12, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'center center', end: 'bottom top', scrub: true } })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} className="relative isolate overflow-hidden bg-midnight text-white">
      <div className="hero-media absolute inset-0 -z-10">
        <img
          src="/images/hero-2000.webp"
          srcSet="/images/hero-720.webp 720w, /images/hero-1200.webp 1200w, /images/hero-2000.webp 2000w"
          sizes="100vw"
          alt="Headlight of a Toyota Fortuner glowing at night"
          fetchPriority="high"
          className="hero-img h-full w-full object-cover object-[70%_center]"
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight via-midnight/55 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-midnight/90 via-transparent to-midnight/30" />
      <div className="hero-veil pointer-events-none absolute inset-0 -z-10 bg-midnight opacity-0" />

      <div className="wrap grid min-h-[100svh] items-center gap-12 pb-16 pt-32 lg:grid-cols-[1.25fr_minmax(0,27rem)] lg:gap-16 lg:pt-28">
        <div className="hero-copy">
          <span className="hero-line mb-8 block h-px w-24 origin-left bg-gold" aria-hidden="true" />
          <h1 className="display">
            <SplitWords text="Your Journey." className="block" />
            <SplitWords text="Our Priority." className="block text-gold-soft" />
          </h1>
          <p className="hero-fade lede mt-7 text-white/75">
            Reliable transportation, premium comfort, and seamless journeys. Experience travel with TTT Cabs.
          </p>
          <div className="hero-fade mt-10 flex flex-wrap gap-3">
            <Link to="/book" className="btn btn-gold">Book Your Ride <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/services" className="btn btn-ghost">Explore Services</Link>
          </div>
        </div>
        <BookingWidget className="hero-widget w-full" />
      </div>
    </section>
  )
}

function Intro() {
  return (
    <section className="py-24 sm:py-32">
      <div className="wrap grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]" data-mask>
          <Picture name="chauffeur" alt="Driver at the wheel of a Maruti Suzuki" sizes="(min-width: 1024px) 45vw, 100vw"
            className="h-[115%] w-full object-cover" data-parallax="0.1" />
        </div>
        <div>
          <p className="text-[clamp(1.6rem,3vw,2.5rem)] font-medium leading-[1.22] tracking-[-0.025em]" data-reveal>
            Whether you need a ride to the airport, a railway station pick-up, an outstation trip or a comfortable commute
            to work, TTT Cabs has you covered.
          </p>
          <p className="mt-8 max-w-xl text-slate" data-reveal>
            Our well-maintained fleet and professional drivers keep you safe and comfortable throughout your journey.
            With round-the-clock availability, you can rely on us at any time, day or night.
          </p>
          <div className="mt-10 flex flex-wrap gap-3" data-reveal>
            <Link to="/about" className="btn btn-navy">About TTT Cabs <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    </section>
  )
}
