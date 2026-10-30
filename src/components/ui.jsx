import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { img, srcSet } from '../data/site'
import { getLenis, reducedMotion, useScrollFx } from '../lib/motion'

/** Words wrapped in clipping spans so they can rise into view. */
export function SplitWords({ text, className = '' }) {
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span className="split-word inline-block will-change-transform">{w}&nbsp;</span>
        </span>
      ))}
    </span>
  )
}

export function Picture({ name, alt, className = '', sizes = '100vw', priority = false, ...rest }) {
  return (
    <img
      src={img(name)}
      srcSet={srcSet(name)}
      sizes={sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={className}
      {...rest}
    />
  )
}

/** Page wrapper: wires scroll effects for everything inside it. */
export function Page({ children }) {
  const ref = useRef(null)
  const { hash } = useLocation()
  useScrollFx(ref)
  useEffect(() => {
    if (!hash) return
    const t = setTimeout(() => {
      const el = document.querySelector(hash)
      if (!el) return
      const l = getLenis()
      if (l) l.scrollTo(el, { offset: -90 })
      else el.scrollIntoView()
    }, 450)
    return () => clearTimeout(t)
  }, [hash])
  return <main ref={ref} id="main">{children}</main>
}

/** Dark cinematic header used by every inner page. */
export function PageHero({ image, title, lede, children }) {
  const ref = useRef(null)
  useEffect(() => {
    if (reducedMotion()) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.ph-img', { scale: 1.18, duration: 2.2, ease: 'power3.out' })
        .from('.split-word', { yPercent: 115, duration: 1.2, stagger: 0.06 }, 0.15)
        .from('.ph-fade', { opacity: 0, y: 20, duration: 1, stagger: 0.1 }, 0.55)
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <section ref={ref} className="relative isolate flex min-h-[72svh] items-end overflow-hidden bg-midnight pb-16 pt-36 text-white sm:pb-20">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -inset-y-[8%] inset-x-0" data-parallax="0.12">
          <Picture name={image} alt="" priority className="ph-img h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/70 to-midnight/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-midnight/80 to-transparent" />
      </div>
      <div className="wrap">
        <h1 className="display max-w-5xl"><SplitWords text={title} /></h1>
        {lede && <p className="ph-fade lede mt-6 text-white/75">{lede}</p>}
        {children && <div className="ph-fade mt-9 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  )
}

export function SectionHead({ title, lede, light = false, action }) {
  return (
    <div className="mb-12 flex flex-col justify-between gap-6 sm:mb-16 md:flex-row md:items-end">
      <div data-reveal>
        <h2 className={`h2 max-w-3xl ${light ? 'text-white' : ''}`}>{title}</h2>
        {lede && <p className={`lede mt-5 ${light ? 'text-white/65' : 'text-slate'}`}>{lede}</p>}
      </div>
      {action && <div data-reveal className="shrink-0">{action}</div>}
    </div>
  )
}

export function TextLink({ to, children, light }) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2 font-semibold ${light ? 'text-gold' : 'text-electric'}`}>
      <span className="link-u">{children}</span>
    </Link>
  )
}
