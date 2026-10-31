import { isIP } from 'node:net'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

/**
 * The visitor's IP. In production the chain is visitor -> Vercel -> Render's Cloudflare -> Render, so
 * req.ip is a proxy address. Vercel puts the visitor's address in x-vercel-forwarded-for.
 * ponytail: someone calling the Render URL directly could forge this header to dodge per-IP limits;
 * per-account lockout still applies. Restrict Render to Vercel's egress if that ever matters.
 */
export function clientIp(req) {
  const v = String(req.get('x-vercel-forwarded-for') || '').split(',')[0].trim()
  return isIP(v) ? v : req.ip
}

/** express-rate-limit keyed on the real visitor IP (IPv6 grouped by /56, as the library recommends). */
export const limiter = (opts) => rateLimit({ ...opts, keyGenerator: (req) => ipKeyGenerator(clientIp(req)) })
