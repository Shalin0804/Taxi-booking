// Client for the TTT Cabs API (server/). Requests go to /api on the same origin:
// Vite proxies it in development and Vercel rewrites it to Render in production,
// so the httpOnly session cookies are first-party. VITE_API_URL can override the origin.
import { company } from '../data/site'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

/** Fired when a session has expired or been revoked; auth providers listen and sign the user out. */
export const UNAUTHORIZED_EVENT = 'ttt:unauthorized'

export async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(API_URL + path, {
      method,
      credentials: 'include',
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        // Required by the server's CSRF check on every state-changing request.
        ...(method !== 'GET' && { 'X-Requested-With': 'ttt' }),
      },
      body: body && JSON.stringify(body),
    })
  } catch {
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && !path.includes('/auth/')) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: path.startsWith('/api/admin') ? 'admin' : 'customer' }))
    }
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields)
  }
  return data
}

/** Authenticated file download (CSV export). */
export async function download(path, filename) {
  const res = await fetch(API_URL + path, { credentials: 'include' })
  if (!res.ok) throw new ApiError(res.status === 403 ? "You don't have permission to export." : 'Export failed', res.status)
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export const submitBooking = (payload) => request('/api/bookings', { method: 'POST', body: payload })
export const submitEnquiry = (payload) => request('/api/enquiries', { method: 'POST', body: payload })

export const whatsappLink = (title, fields) => {
  const lines = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
  return `https://wa.me/${company.whatsapp}?text=${encodeURIComponent([title, '', ...lines].join('\n'))}`
}

/** Only same-site paths are allowed as a post-login destination (blocks //evil.com and /\evil.com). */
export const safeNext = (n) => (typeof n === 'string' && /^\/(?![/\\])/.test(n) ? n : null)
