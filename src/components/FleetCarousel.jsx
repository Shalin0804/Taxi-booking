import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { m, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { fleet } from '../data/site'
import { Picture } from './ui'

export default function FleetCarousel({ light = false }) {
  const track = useRef(null)
  const [progress, setProgress] = useState(0)
  const [edge, setEdge] = useState({ start: true, end: false })

  useEffect(() => {
    const el = track.current
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth
      setProgress(max > 0 ? el.scrollLeft / max : 1)
      setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8 })
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll) }
  }, [])

  const go = (dir) => {
    const el = track.current
    const card = el.querySelector('[data-card]')
    el.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: 'smooth' })
  }

  const btn = `grid h-12 w-12 place-items-center rounded-full border transition-all disabled:opacity-30 ${
    light ? 'border-white/25 text-white hover:bg-white hover:text-midnight' : 'border-ink/15 hover:bg-midnight hover:text-white'}`

  return (
    <div>
      <div
        ref={track}
        data-lenis-prevent-wheel=""
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto sm:scroll-px-6 lg:scroll-px-10 scroll-smooth px-4 pb-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Fleet categories"
        tabIndex={0}
      >
        {fleet.map((v) => <FleetCard key={v.name} v={v} light={light} />)}
        <div className="w-px shrink-0" aria-hidden="true" />
      </div>
      <div className="mt-8 flex items-center gap-6">
        <div className={`relative h-px flex-1 ${light ? 'bg-white/15' : 'bg-ink/10'}`}>
          <m.div className="absolute inset-y-0 left-0 bg-gold" style={{ width: `${Math.max(progress * 100, 12)}%` }} transition={{ type: 'spring' }} />
        </div>
        <button className={btn} onClick={() => go(-1)} disabled={edge.start} aria-label="Previous vehicle"><ChevronLeft className="h-5 w-5" /></button>
        <button className={btn} onClick={() => go(1)} disabled={edge.end} aria-label="Next vehicle"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </div>
  )
}

function FleetCard({ v, light }) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rx = useSpring(useTransform(my, [0, 1], [5, -5]), { stiffness: 160, damping: 18 })
  const ry = useSpring(useTransform(mx, [0, 1], [-6, 6]), { stiffness: 160, damping: 18 })

  const onMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }
  const reset = () => { mx.set(0.5); my.set(0.5) }

  return (
    <m.article
      data-card
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      className={`group relative w-[84%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] sm:w-[58%] lg:w-[42%] ${
        light ? 'bg-navy text-white' : 'bg-mist'}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Picture name={v.image} alt={`${v.name} vehicle`} sizes="(min-width: 1024px) 42vw, 84vw"
          className="h-full w-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-lux)] group-hover:scale-110" />
      </div>
      <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
        <div>
          <h3 className="text-2xl font-semibold">{v.name}</h3>
          {v.models && (
            <p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${light ? 'text-gold-soft' : 'text-gold-dark'}`}>
              {v.models}
            </p>
          )}
          <p className={`mt-1.5 max-w-sm text-[0.95rem] ${light ? 'text-white/65' : 'text-slate'}`}>{v.use}</p>
          <p className={`mt-3 flex items-center gap-2 text-sm ${light ? 'text-white/50' : 'text-slate/80'}`}>
            <Users className="h-4 w-4" /> Seats and luggage confirmed when you book
          </p>
        </div>
        <Link to={`/book?vehicle=${encodeURIComponent(v.name)}`} className={`btn shrink-0 !px-5 !py-2.5 ${light ? 'btn-gold' : 'btn-navy'}`}>
          Book {v.name.split(' ')[0]}
        </Link>
      </div>
    </m.article>
  )
}
