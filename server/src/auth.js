// Two independent auth contexts share one users table:
//   customer: cookie `ttt_customer`, JWT audience "customer", role must be CUSTOMER
//   admin:    cookie `ttt_admin`,    JWT audience "admin",    role must be a staff role
// Each JWT points at a row in `sessions`, so logout and revocation take effect immediately,
// and the role is re-read from the database on every request.
import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { query } from './db.js'

const SECRET = process.env.JWT_SECRET
if (!SECRET || SECRET.length < 32) throw new Error('JWT_SECRET must be set (32+ characters)')
const PROD = process.env.NODE_ENV === 'production'

export const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER', 'FLEET_MANAGER', 'SUPPORT_STAFF']

// Permission map, enforced on every admin endpoint.
const P = {
  'stats:read': STAFF_ROLES,
  'bookings:read': ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER', 'SUPPORT_STAFF'],
  'bookings:write': ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER'],
  'bookings:export': ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER'],
  'customers:read': ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER', 'SUPPORT_STAFF'],
  'customers:write': ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_STAFF'],
  'fleet:read': ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER', 'FLEET_MANAGER'],
  'fleet:write': ['SUPER_ADMIN', 'ADMIN', 'FLEET_MANAGER'],
  'pricing:read': ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER'],
  'pricing:write': ['SUPER_ADMIN', 'ADMIN'],
  'enquiries:read': ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_STAFF'],
  'enquiries:write': ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_STAFF'],
  'reports:read': ['SUPER_ADMIN', 'ADMIN', 'BOOKING_MANAGER'],
  'users:manage': ['SUPER_ADMIN'],
  'audit:read': ['SUPER_ADMIN'],
}
export const can = (role, perm) => !!P[perm]?.includes(role)
export const permissionsFor = (role) => Object.keys(P).filter((p) => can(role, p))

const COOKIE = { customer: 'ttt_customer', admin: 'ttt_admin' }
const TTL = { customer: 12 * 3600e3, customerRemember: 30 * 864e5, admin: 8 * 3600e3 }
const cookieOpts = { httpOnly: true, secure: PROD, sameSite: 'lax', path: '/api' }

const toSql = (d) => d.toISOString().slice(0, 19).replace('T', ' ')

export async function startSession(res, user, kind, remember = false) {
  const ttl = kind === 'admin' ? TTL.admin : remember ? TTL.customerRemember : TTL.customer
  const sid = randomBytes(16).toString('hex')
  const expires = new Date(Date.now() + ttl)
  await query('INSERT INTO sessions (id, user_id, kind, expires_at) VALUES (?, ?, ?, ?)', [sid, user.id, kind, toSql(expires)])
  const token = jwt.sign({ sid, sub: user.id }, SECRET, { audience: kind, expiresIn: Math.floor(ttl / 1000) })
  // "Remember me" keeps a persistent cookie; otherwise it's a browser-session cookie.
  res.cookie(COOKIE[kind], token, { ...cookieOpts, ...(kind === 'customer' && remember ? { maxAge: ttl } : {}) })
}

export async function endSession(req, res, kind) {
  const s = decode(req, kind)
  if (s) await query('UPDATE sessions SET revoked_at = NOW() WHERE id = ?', [s.sid])
  res.clearCookie(COOKIE[kind], cookieOpts)
}

export const revokeAllSessions = (userId, kind) =>
  query(`UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL ${kind ? 'AND kind = ?' : ''}`, kind ? [userId, kind] : [userId])

function decode(req, kind) {
  const token = req.cookies?.[COOKIE[kind]]
  if (!token) return null
  try {
    return jwt.verify(token, SECRET, { audience: kind })
  } catch {
    return null
  }
}

/** The signed-in user for this context, or null. */
export async function load(req, kind) {
  const t = decode(req, kind)
  if (!t) return null
  const [u] = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.status, s.id AS sid FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.user_id = ? AND s.kind = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()`,
    [t.sid, t.sub, kind],
  )
  if (!u || u.status !== 'active') return null
  const roleOk = kind === 'customer' ? u.role === 'CUSTOMER' : STAFF_ROLES.includes(u.role)
  return roleOk ? u : null
}

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role })

/** Customer-only endpoints: 401 without a valid customer session. Admin cookies are never consulted. */
export const requireCustomer = async (req, res, next) => {
  const u = await load(req, 'customer')
  if (!u) return res.status(401).json({ error: 'Please sign in to continue.' })
  req.user = u
  next()
}

/**
 * Admin endpoints: 401 without a valid admin session, 403 when the role lacks every listed permission.
 * Customer cookies are never consulted, so a customer token can't reach these.
 */
export const requireAdmin = (...perms) => async (req, res, next) => {
  const u = await load(req, 'admin')
  if (!u) return res.status(401).json({ error: 'Please sign in to the admin portal.' })
  if (perms.length && !perms.some((p) => can(u.role, p))) return res.status(403).json({ error: "You don't have permission to do this." })
  req.user = u
  next()
}

export async function audit(req, action, entity, entityId, details) {
  await query('INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip) VALUES (?, ?, ?, ?, ?, ?)', [
    req.user?.id ?? null, action, entity ?? null, entityId == null ? null : String(entityId),
    details ? JSON.stringify(details).slice(0, 4000) : null, req.ip,
  ])
}
