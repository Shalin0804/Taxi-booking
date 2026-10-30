import { createHash, randomBytes } from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { endSession, publicUser, requireCustomer, revokeAllSessions, startSession } from '../auth.js'
import { checkPassword } from '../login.js'
import { sendMail } from '../mailer.js'
import { check, isDate, isEmail, isPhone, isTime, normPhone, str, today } from '../validate.js'

export const TRIP_TYPES = ['Airport transfer', 'Railway transfer', 'Hourly rental', 'Outstation one-way', 'Outstation round trip', 'Corporate / custom']
const r = Router()
const authLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 30, message: { error: 'Too many attempts. Try again in 15 minutes.' } })
const bookingLimiter = rateLimit({ windowMs: 60 * 60e3, limit: 30, message: { error: 'Too many bookings in a short time. Please call us.' } })
const pw = (v) => (typeof v === 'string' ? v : '')
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

// ---------- Auth ----------
r.post('/auth/register', authLimiter, async (req, res) => {
  const name = str(req.body.name, 120)
  const email = str(req.body.email, 190).toLowerCase()
  const phone = normPhone(req.body.phone)
  const password = pw(req.body.password)
  check({
    name: [name.length >= 2, 'Enter your full name'],
    email: [isEmail(email), 'Enter a valid email'],
    phone: [isPhone(phone), 'Enter a 10-digit mobile number'],
    password: [password.length >= 8 && password.length <= 72, 'Use 8 to 72 characters'],
  })
  const [dupe] = await query('SELECT email = ? AS sameEmail FROM users WHERE email = ? OR phone = ? LIMIT 1', [email, email, phone])
  if (dupe) {
    return res.status(409).json({
      error: 'An account with these details already exists. Sign in instead.',
      fields: dupe.sameEmail ? { email: 'Already registered' } : { phone: 'Already registered' },
    })
  }
  const ins = await query('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)', [name, email, phone, await bcrypt.hash(password, 12)])
  const user = { id: ins.insertId, name, email, phone, role: 'CUSTOMER' }
  await startSession(res, user, 'customer', !!req.body.remember)
  res.status(201).json({ user })
})

r.post('/auth/login', authLimiter, async (req, res) => {
  const id = str(req.body.identifier, 190).toLowerCase()
  const byEmail = id.includes('@')
  // Customer login only matches customer accounts; staff must use the admin portal.
  const result = await checkPassword(`${byEmail ? 'email' : 'phone'} = ? AND role = 'CUSTOMER'`, [byEmail ? id : normPhone(id)], pw(req.body.password))
  if (result.error) return res.status(result.status).json({ error: result.status === 401 ? 'Email, phone or password is incorrect.' : result.error })
  await startSession(res, result.user, 'customer', !!req.body.remember)
  res.json({ user: publicUser(result.user) })
})

r.post('/auth/logout', async (req, res) => {
  await endSession(req, res, 'customer')
  res.json({ ok: true })
})

r.get('/auth/me', requireCustomer, (req, res) => res.json({ user: publicUser(req.user) }))

r.post('/auth/forgot-password', authLimiter, async (req, res) => {
  const email = str(req.body.email, 190).toLowerCase()
  const [u] = await query("SELECT id, name, email FROM users WHERE email = ? AND status = 'active'", [email])
  if (u) {
    const token = randomBytes(32).toString('hex')
    await query('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL 30 MINUTE)', [u.id, sha256(token)])
    const base = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
    await sendMail({
      to: u.email,
      subject: 'Reset your TTT Cabs password',
      text: `Hello ${u.name},\n\nUse this link to choose a new password. It works once and expires in 30 minutes:\n${base}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email.`,
    })
  }
  // Same answer whether or not the account exists.
  res.json({ ok: true })
})

r.post('/auth/reset-password', authLimiter, async (req, res) => {
  const token = str(req.body.token, 100)
  const password = pw(req.body.password)
  check({ password: [password.length >= 8 && password.length <= 72, 'Use 8 to 72 characters'] })
  const [t] = await query('SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()', [sha256(token)])
  if (!t) return res.status(400).json({ error: 'This reset link is invalid or has expired. Request a new one.' })
  // Mark used first; the WHERE guard makes a second concurrent use fail.
  const used = await query('UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE id = ? AND used_at IS NULL', [t.id])
  if (!used.affectedRows) return res.status(400).json({ error: 'This reset link has already been used.' })
  await query('UPDATE users SET password_hash = ?, failed_logins = 0, locked_until = NULL WHERE id = ?', [await bcrypt.hash(password, 12), t.user_id])
  await revokeAllSessions(t.user_id)
  res.json({ ok: true })
})

// ---------- Profile ----------
r.patch('/me', requireCustomer, async (req, res) => {
  const name = str(req.body.name, 120)
  const phone = normPhone(req.body.phone)
  check({ name: [name.length >= 2, 'Enter your full name'], phone: [isPhone(phone), 'Enter a 10-digit mobile number'] })
  const [taken] = await query('SELECT id FROM users WHERE phone = ? AND id <> ?', [phone, req.user.id])
  if (taken) return res.status(409).json({ error: 'That mobile number is linked to another account.', fields: { phone: 'Already registered' } })
  await query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id])
  res.json({ user: { ...publicUser(req.user), name, phone } })
})

r.post('/me/password', requireCustomer, async (req, res) => {
  const [u] = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id])
  const next = pw(req.body.newPassword)
  check({ newPassword: [next.length >= 8 && next.length <= 72, 'Use 8 to 72 characters'] })
  if (!(await bcrypt.compare(pw(req.body.currentPassword), u.password_hash))) {
    return res.status(400).json({ error: 'Your current password is incorrect.', fields: { currentPassword: 'Incorrect password' } })
  }
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(next, 12), req.user.id])
  // Sign out other devices; keep this one.
  await query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND id <> ? AND revoked_at IS NULL', [req.user.id, req.user.sid])
  res.json({ ok: true })
})

// ---------- Bookings (customer only, own records only) ----------
const OWN_COLS = `b.reference, b.trip_type, b.pickup, b.dropoff, b.pickup_date, b.pickup_time, b.return_date, b.vehicle_pref,
  b.passengers, b.name, b.phone, b.email, b.notes, b.status, b.cancel_requested_at, b.fare, b.created_at, b.updated_at,
  d.name AS driver_name, d.phone AS driver_phone, v.model AS vehicle_model, v.registration`
const OWN_FROM = 'FROM bookings b LEFT JOIN drivers d ON d.id = b.driver_id LEFT JOIN vehicles v ON v.id = b.vehicle_id'

r.post('/bookings', bookingLimiter, requireCustomer, async (req, res) => {
  const b = req.body
  const f = {
    trip: str(b.trip, 60), pickup: str(b.pickup), drop: str(b.drop), date: str(b.date, 10), time: str(b.time, 8),
    returnDate: str(b.returnDate, 10), vehicle: str(b.vehicle, 60), passengers: str(b.passengers, 5), notes: str(b.notes, 2000),
    // Passenger contact defaults to the account holder; it can differ when booking for someone else.
    name: str(b.name, 120) || req.user.name, phone: normPhone(b.phone) || req.user.phone || '', email: str(b.email, 190) || req.user.email,
  }
  check({
    trip: [TRIP_TYPES.includes(f.trip), 'Choose a trip type'],
    pickup: [f.pickup.length > 1, 'Enter a pickup location'],
    drop: [f.trip === 'Hourly rental' || f.drop.length > 1, 'Enter a destination'],
    date: [isDate(f.date) && f.date >= today(), 'Choose a pickup date that is today or later'],
    time: [isTime(f.time), 'Choose a pickup time'],
    returnDate: [!f.returnDate || (isDate(f.returnDate) && f.returnDate >= f.date), 'Return must be on or after the pickup date'],
    name: [f.name.length >= 2, 'Enter the passenger name'],
    phone: [isPhone(f.phone), 'Enter a 10-digit mobile number'],
    email: [isEmail(f.email), 'Enter a valid email'],
  })
  const reference = 'TTT-' + randomBytes(4).toString('hex').toUpperCase()
  // Ownership always comes from the session; any user_id in the body is ignored.
  await query(
    `INSERT INTO bookings (reference, user_id, trip_type, pickup, dropoff, pickup_date, pickup_time, return_date, vehicle_pref, passengers, name, phone, email, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [reference, req.user.id, f.trip, f.pickup, f.drop || null, f.date, f.time, f.returnDate || null,
      f.vehicle || null, f.passengers || null, f.name, f.phone, f.email, f.notes || null],
  )
  res.status(201).json({ reference })
})

r.get('/bookings', requireCustomer, async (req, res) => {
  const rows = await query(`SELECT ${OWN_COLS} ${OWN_FROM} WHERE b.user_id = ? ORDER BY b.pickup_date DESC, b.pickup_time DESC`, [req.user.id])
  res.json({ rows })
})

/** Loads a booking by reference: 404 if it doesn't exist, 403 if it belongs to someone else. */
async function ownBooking(req, res) {
  const [row] = await query(`SELECT b.user_id, ${OWN_COLS} ${OWN_FROM} WHERE b.reference = ?`, [str(req.params.ref, 16)])
  if (!row) { res.status(404).json({ error: 'Booking not found.' }); return null }
  if (row.user_id !== req.user.id) { res.status(403).json({ error: "You don't have access to this booking." }); return null }
  delete row.user_id
  return row
}

r.get('/bookings/:ref', requireCustomer, async (req, res) => {
  const row = await ownBooking(req, res)
  if (row) res.json({ row })
})

/** Pending/confirmed trips cancel immediately; later stages become a cancellation request for the team. */
r.patch('/bookings/:ref/cancel', requireCustomer, async (req, res) => {
  const row = await ownBooking(req, res)
  if (!row) return
  if (['pending', 'confirmed'].includes(row.status)) {
    await query("UPDATE bookings SET status = 'cancelled' WHERE reference = ? AND user_id = ?", [row.reference, req.user.id])
    return res.json({ outcome: 'cancelled' })
  }
  if (row.status === 'assigned' && !row.cancel_requested_at) {
    await query('UPDATE bookings SET cancel_requested_at = UTC_TIMESTAMP() WHERE reference = ? AND user_id = ?', [row.reference, req.user.id])
    return res.json({ outcome: 'requested' })
  }
  res.status(409).json({ error: 'This booking can no longer be cancelled online. Please call us.' })
})

export default r
