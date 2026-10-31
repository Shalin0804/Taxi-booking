import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { limiter } from './ip.js'
import { query } from './db.js'
import { check, isEmail, isPhone, normPhone, str } from './validate.js'
import customer from './routes/customer.js'
import admin from './routes/admin.js'

export const app = express()
// Proxies in front of the app. Visitor IPs come from clientIp() (src/ip.js); this is only its fallback.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))
app.disable('x-powered-by')
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)
// Origins that count as "this site": the configured list, the API's own host, and the host a proxy
// (Vercel's /api rewrite) says the browser used. A foreign page can't spoof the latter, because the
// required X-Requested-With header forces a CORS preflight that other origins fail.
const sameSite = (req, origin) => {
  if (origins.includes(origin)) return true
  const hosts = [req.get('host'), ...String(req.get('x-forwarded-host') || '').split(',')].map((h) => h?.trim()).filter(Boolean)
  return hosts.some((h) => origin === `https://${h}` || origin === `http://${h}`)
}
app.use(cors({ origin: origins, credentials: true }))
app.use(express.json({ limit: '50kb' }))
app.use(cookieParser())

// CSRF: auth cookies are SameSite=Lax, and every state-changing request must also carry a custom header,
// which a cross-site form or image can't send. A mismatched Origin is rejected outright.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const origin = req.get('origin')
  if (req.get('x-requested-with') !== 'ttt' || (origin && !sameSite(req, origin))) {
    return res.status(403).json({ error: 'Request blocked. Please reload the page and try again.' })
  }
  next()
})

app.get('/api/health', async (_req, res) => {
  await query('SELECT 1')
  res.json({ ok: true })
})

// Public: contact and corporate enquiries don't need an account.
const formLimiter = limiter({ windowMs: 60 * 60e3, limit: 30, message: { error: 'Too many submissions. Try again later.' } })
app.post('/api/enquiries', formLimiter, async (req, res) => {
  const b = req.body
  const type = b.type === 'corporate' ? 'corporate' : 'contact'
  const f = {
    name: str(type === 'corporate' ? b.contact : b.name, 120), email: str(b.email, 190), phone: normPhone(b.phone),
    company: str(b.company, 160), subject: str(b.subject, 120), employees: str(b.employees, 20),
    message: str(type === 'corporate' ? b.requirements : b.message, 5000),
  }
  check({
    name: [f.name.length >= 2, 'Enter a name'],
    email: [isEmail(f.email), 'Enter a valid email'],
    phone: [isPhone(f.phone), 'Enter a 10-digit mobile number'],
    company: [type !== 'corporate' || f.company.length >= 2, 'Enter your company name'],
    message: [f.message.length >= 10, 'Tell us a little more (at least 10 characters)'],
  })
  await query('INSERT INTO enquiries (type, name, email, phone, company, subject, employees, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [type, f.name, f.email, f.phone, f.company || null, f.subject || null, f.employees || null, f.message])
  res.status(201).json({ ok: true })
})

app.use('/api/admin', admin)
app.use('/api', customer)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, _req, res, _next) => {
  if (err.status === 400 && err.fields) return res.status(400).json({ error: err.message, fields: err.fields })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' })
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That record already exists.' })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' })
})
