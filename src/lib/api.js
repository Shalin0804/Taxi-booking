// Client for the TTT Cabs API (server/). Set VITE_API_URL to the API's origin, e.g.
// https://tttcabs-api.onrender.com. Without it, forms fall back to a WhatsApp/email hand-off
// (NotConnectedError) and never pretend a booking was received.
import { company } from '../data/site'

export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'ttt_token'

export class NotConnectedError extends Error {}
export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

// ponytail: token in localStorage (simple across Vercel/Render origins); move to an httpOnly cookie on a shared domain if XSS risk grows.
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ } }

export async function request(path, { method = 'GET', body } = {}) {
  if (!API_URL) throw new NotConnectedError('No API configured')
  const token = getToken()
  let res
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    })
  } catch {
    throw new ApiError("We couldn't reach the server. Check your connection and try again.", 0)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields)
  return data
}

/** Authenticated file download (CSV export). */
export async function download(path, filename) {
  const res = await fetch(API_URL + path, { headers: { Authorization: `Bearer ${getToken()}` } })
  if (!res.ok) throw new ApiError('Export failed', res.status)
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
