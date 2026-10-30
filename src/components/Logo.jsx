import { Link } from 'react-router-dom'

// The live site's logo image (crmbeta.traviyo.in) returns an HTML error page,
// so this wordmark stands in until the brand supplies the original artwork.
export default function Logo({ className = '' }) {
  return (
    <Link to="/" aria-label="TTT Cabs home" className={`group inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" opacity="0.08" />
        <circle cx="9" cy="23" r="3" fill="#C8A96B" />
        <circle cx="23" cy="9" r="3" fill="none" stroke="#C8A96B" strokeWidth="2" />
        <path d="M9 23 C 9 14, 23 18, 23 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 2.4"
          className="transition-[stroke-dashoffset] duration-700 group-hover:[stroke-dashoffset:-9]" />
      </svg>
      <span className="text-[1.3rem] leading-none tracking-[-0.04em]">
        <span className="font-extrabold">TTT</span>
        <span className="font-light"> Cabs</span>
      </span>
    </Link>
  )
}
