import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Picture } from './ui'

export default function ServiceCard({ s, className = '', sizes = '(min-width: 1024px) 33vw, 100vw' }) {
  const to = s.href || `/services/${s.slug}`
  return (
    <Link
      to={to}
      data-reveal
      className={`group relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-[1.5rem] bg-navy p-6 text-white sm:p-8 ${className}`}
    >
      <Picture name={s.image} alt="" sizes={sizes}
        className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1.4s] ease-[var(--ease-lux)] group-hover:scale-[1.07]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-midnight via-midnight/55 to-midnight/5 transition-opacity duration-700 group-hover:opacity-90" />

      <span className="absolute left-6 top-6 grid h-11 w-11 place-items-center rounded-full bg-midnight/60 text-gold ring-1 ring-white/10 backdrop-blur-md sm:left-8 sm:top-8">
        <s.icon className="h-5 w-5" />
      </span>

      <h3 className="text-[1.7rem] font-semibold">{s.title}</h3>
      {/* Description is always shown on touch; on hover-capable screens it slides open. */}
      <div className="grid transition-[grid-template-rows] duration-700 ease-[var(--ease-lux)] lg:[@media(hover:hover)]:grid-rows-[0fr] lg:[@media(hover:hover)]:group-hover:grid-rows-[1fr] lg:[@media(hover:hover)]:group-focus-visible:grid-rows-[1fr]">
        <p className="overflow-hidden text-white/75">
          <span className="block pt-2.5">{s.short}</span>
        </p>
      </div>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold">
        Explore more
        <span className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 transition-all duration-500 group-hover:rotate-45 group-hover:border-gold group-hover:bg-gold group-hover:text-midnight">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </span>
    </Link>
  )
}
