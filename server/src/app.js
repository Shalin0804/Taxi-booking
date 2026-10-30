import { randomBytes } from 'node:crypto'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { query } from './db.js'
import { optionalAuth, publicUser, requireAuth, sign } from './auth.js'
import { check, isDate, isEmail, isPhone, isTime, str, today } from './validate.js'

export const app = express()
app.set('trust proxy', 1) // Render sits behind a proxy; needed for per-IP rate limits.
app.use(cors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()) }))
app.use(express.json({ limit: '50kb' }))

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { error: 'Too many attempts. Try again in 15 minutes.' } })
const formLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, message: { error: 'Too many submissions. Try again later.' } })

const TRIP_TYPES = ['Airport transfer', 'Railway transfer', 'Hourly rental', 'Outstation one-way', 'Outstation round trip', 'Corporate / custom']
const BOOKING_STATUS = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']
const staff = requireAuth('staff', 'admin')
const admin = requireAuth('admin')

app.get('/api/health', async (_req, res) => {
  await query('SELECT 1')
  res.json({ ok: true })
})

// ---------- Auth ----------
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const name = str(req.body.name, 120)
  const email = str(req.body.email, 190).toLowerCase()
  const phone = str(req.body.phone, 20)
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  check({
    name: [name.length >= 2, 'Enter your full name'],
    email: [isEmail(email), 'Enter a valid email'],
    phone: [isPhone(phone), 'Enter a 10-digit mobile number'],
    password: [password.length >= 8 && password.length <= 72, 'Use 8 to 72 characters'],
  })
  const [existing] = await query('SELECT id FROM users WHERE email = ?', [email])
  if (existing) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', fields: { email: 'Already registered' } })
  const hash = await bcrypt.hash(password, 12)
  const r = await query('INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)', [name, email, phone, hash])
  const user = { id: r.insertId, name, email, phone, role: 'customer' }
  res.status(201).json({ token: sign(user), user })
})

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const email = str(req.body.email, 190).toLowerCase()
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  const [u] = await query('SELECT * FROM users WHERE email = ?', [email])
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' })
  res.json({ token: sign(u), user: publicUser(u) })
})

app.get('/api/auth/me', requireAuth(), async (req, res) => {
  const [u] = await query('SELECT * FROM users WHERE id = ?', [req.user.sub])
  if (!u) return res.status(401).json({ error: 'Please sign in.' })
  res.json({ user: publicUser(u) })
})

// ---------- Public: bookings and enquiries ----------
app.post('/api/bookings', formLimiter, optionalAuth, async (req, res) => {
  const b = req.body
  const f = {
    trip: str(b.trip, 60), pickup: str(b.pickup), drop: str(b.drop), date: str(b.date, 10), time: str(b.time, 8),
    returnDate: str(b.returnDate, 10), vehicle: str(b.vehicle, 60), passengers: str(b.passengers, 5),
    name: str(b.name, 120), phone: str(b.phone, 20), email: str(b.email, 190), notes: str(b.notes, 2000),
  }
  check({
    trip: [TRIP_TYPES.includes(f.trip), 'Choose a trip type'],
    pickup: [f.pickup.length > 1, 'Enter a pickup location'],
    drop: [f.trip === 'Hourly rental' || f.drop.length > 1, 'Enter a destination'],
    date: [isDate(f.date) && f.date >= today(), 'Choose a pickup date that is today or later'],
    time: [isTime(f.time), 'Choose a pickup time'],
    returnDate: [!f.returnDate || (isDate(f.returnDate) && f.returnDate >= f.date), 'Return must be on or after the pickup date'],
    name: [f.name.length >= 2, 'Enter your full name'],
    phone: [isPhone(f.phone), 'Enter a 10-digit mobile number'],
    email: [!f.email || isEmail(f.email), 'Enter a valid email'],
  })
  const reference = 'TTT-' + randomBytes(4).toString('hex').toUpperCase()
  await query(
    `INSERT INTO bookings (reference, user_id, trip_type, pickup, dropoff, pickup_date, pickup_time, return_date, vehicle_pref, passengers, name, phone, email, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [reference, req.user?.sub ?? null, f.trip, f.pickup, f.drop || null, f.date, f.time, f.returnDate || null,
      f.vehicle || null, f.passengers || null, f.name, f.phone, f.email || null, f.notes || null],
  )
  res.status(201).json({ reference })
})

app.post('/api/enquiries', formLimiter, async (req, res) => {
  const b = req.body
  const type = b.type === 'corporate' ? 'corporate' : 'contact'
  const f = {
    name: str(type === 'corporate' ? b.contact : b.name, 120), email: str(b.email, 190), phone: str(b.phone, 20),
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

// ---------- Signed-in customer ----------
const MY_BOOKING_COLS = `b.reference, b.trip_type, b.pickup, b.dropoff, b.pickup_date, b.pickup_time, b.return_date, b.vehicle_pref,
  b.passengers, b.status, b.fare, b.created_at, d.name AS driver_name, d.phone AS driver_phone, v.model AS vehicle_model, v.registration`

app.get('/api/my/bookings', requireAuth(), async (req, res) => {
  const rows = await query(`SELECT ${MY_BOOKING_COLS} FROM bookings b
    LEFT JOIN drivers d ON d.id = b.driver_id LEFT JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.user_id = ? ORDER BY b.created_at DESC`, [req.user.sub])
  res.json({ rows })
})

app.post('/api/my/bookings/:ref/cancel', requireAuth(), async (req, res) => {
  const r = await query("UPDATE bookings SET status = 'cancelled' WHERE reference = ? AND user_id = ? AND status IN ('pending', 'confirmed')",
    [req.params.ref, req.user.sub])
  if (!r.affectedRows) return res.status(409).json({ error: 'This booking can no longer be cancelled online. Please call us.' })
  res.json({ ok: true })
})

// ---------- Admin: overview ----------
app.get('/api/admin/stats', staff, async (_req, res) => {
  const [counts] = await query(`SELECT
      (SELECT COUNT(*) FROM bookings) AS bookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending,
      (SELECT COUNT(*) FROM bookings WHERE pickup_date = CURDATE()) AS today,
      (SELECT COUNT(*) FROM enquiries WHERE status = 'new') AS new_enquiries,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customers,
      (SELECT COUNT(*) FROM vehicles WHERE status = 'active') AS active_vehicles,
      (SELECT COUNT(*) FROM drivers WHERE status = 'available') AS available_drivers`)
  const byStatus = await query('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status')
  const byDay = await query(`SELECT DATE(created_at) AS day, COUNT(*) AS n FROM bookings
    WHERE created_at >= CURDATE() - INTERVAL 13 DAY GROUP BY DATE(created_at) ORDER BY day`)
  const byTrip = await query('SELECT trip_type, COUNT(*) AS n FROM bookings GROUP BY trip_type ORDER BY n DESC')
  const recent = await query('SELECT reference, name, trip_type, pickup_date, status FROM bookings ORDER BY created_at DESC LIMIT 6')
  res.json({ counts, byStatus, byDay, byTrip, recent })
})

// ---------- Admin: bookings ----------
function bookingFilter(q) {
  const where = []
  const params = []
  if (BOOKING_STATUS.includes(q.status)) { where.push('b.status = ?'); params.push(q.status) }
  if (TRIP_TYPES.includes(q.trip)) { where.push('b.trip_type = ?'); params.push(q.trip) }
  if (isDate(q.from)) { where.push('b.pickup_date >= ?'); params.push(q.from) }
  if (isDate(q.to)) { where.push('b.pickup_date <= ?'); params.push(q.to) }
  const s = str(q.q, 80)
  if (s) {
    where.push('(b.reference LIKE ? OR b.name LIKE ? OR b.phone LIKE ? OR b.pickup LIKE ? OR b.dropoff LIKE ?)')
    params.push(...Array(5).fill(`%${s}%`))
  }
  return { sql: where.length ? 'WHERE ' + where.join(' AND ') : '', params }
}
const ADMIN_BOOKING_SQL = `SELECT b.*, d.name AS driver_name, v.model AS vehicle_model, v.registration
  FROM bookings b LEFT JOIN drivers d ON d.id = b.driver_id LEFT JOIN vehicles v ON v.id = b.vehicle_id`

app.get('/api/admin/bookings', staff, async (req, res) => {
  const { sql, params } = bookingFilter(req.query)
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM bookings b ${sql}`, params)
  const rows = await query(`${ADMIN_BOOKING_SQL} ${sql} ORDER BY b.created_at DESC LIMIT 20 OFFSET ?`, [...params, (page - 1) * 20])
  res.json({ rows, total, page, pageSize: 20 })
})

app.get('/api/admin/bookings/:id', staff, async (req, res) => {
  const [row] = await query(`${ADMIN_BOOKING_SQL} WHERE b.id = ?`, [req.params.id])
  if (!row) return res.status(404).json({ error: 'Booking not found' })
  res.json({ row })
})

app.patch('/api/admin/bookings/:id', staff, async (req, res) => {
  const b = req.body
  const sets = []
  const params = []
  if (b.status !== undefined) {
    check({ status: [BOOKING_STATUS.includes(b.status), 'Unknown status'] })
    sets.push('status = ?'); params.push(b.status)
  }
  for (const k of ['driver_id', 'vehicle_id']) {
    if (b[k] === undefined) continue
    const id = b[k] === null || b[k] === '' ? null : parseInt(b[k])
    if (id !== null) {
      const [exists] = await query(`SELECT id FROM ${k === 'driver_id' ? 'drivers' : 'vehicles'} WHERE id = ?`, [id])
      check({ [k]: [!!exists, 'Not found'] })
    }
    sets.push(`${k} = ?`); params.push(id)
  }
  if (b.fare !== undefined) {
    const fare = b.fare === null || b.fare === '' ? null : Number(b.fare)
    check({ fare: [fare === null || (Number.isFinite(fare) && fare >= 0), 'Enter a valid amount'] })
    sets.push('fare = ?'); params.push(fare)
  }
  if (b.admin_notes !== undefined) { sets.push('admin_notes = ?'); params.push(str(b.admin_notes, 2000) || null) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  const r = await query(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?`, [...params, req.params.id])
  if (!r.affectedRows) return res.status(404).json({ error: 'Booking not found' })
  const [row] = await query(`${ADMIN_BOOKING_SQL} WHERE b.id = ?`, [req.params.id])
  res.json({ row })
})

// CSV opens directly in Excel. Cells starting with = + - @ are prefixed so they can't run as formulas.
const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
app.get('/api/admin/bookings.csv', staff, async (req, res) => {
  const { sql, params } = bookingFilter(req.query)
  const rows = await query(`${ADMIN_BOOKING_SQL} ${sql} ORDER BY b.created_at DESC LIMIT 10000`, params)
  const cols = ['reference', 'status', 'trip_type', 'pickup', 'dropoff', 'pickup_date', 'pickup_time', 'return_date', 'vehicle_pref',
    'passengers', 'name', 'phone', 'email', 'driver_name', 'vehicle_model', 'registration', 'fare', 'notes', 'admin_notes', 'created_at']
  const body = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="tttcabs-bookings-${today()}.csv"`)
  res.send('﻿' + body)
})

// ---------- Admin: customers ----------
app.get('/api/admin/customers', staff, async (req, res) => {
  const s = str(req.query.q, 80)
  const rows = await query(`SELECT u.id, u.name, u.email, u.phone, u.created_at, COUNT(b.id) AS bookings
    FROM users u LEFT JOIN bookings b ON b.user_id = u.id WHERE u.role = 'customer'
    ${s ? 'AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)' : ''}
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`, s ? Array(3).fill(`%${s}%`) : [])
  res.json({ rows })
})

// ---------- Admin: generic CRUD for simple tables ----------
/** fields: { column: (value) => [cleanValue, errorMessage|''] } */
function crud(path, table, fields, guard, order = 'id DESC') {
  const clean = (body, partial) => {
    const out = {}
    const errors = {}
    for (const [col, fn] of Object.entries(fields)) {
      if (partial && body[col] === undefined) continue
      const [v, err] = fn(body[col])
      if (err) errors[col] = err
      else out[col] = v
    }
    check(Object.fromEntries(Object.entries(errors).map(([k, m]) => [k, [false, m]])))
    return out
  }
  app.get(`/api/admin/${path}`, guard, async (_req, res) => res.json({ rows: await query(`SELECT * FROM ${table} ORDER BY ${order}`) }))
  app.post(`/api/admin/${path}`, guard, async (req, res) => {
    const data = clean(req.body, false)
    const r = await query(`INSERT INTO ${table} SET ?`, [data])
    const [row] = await query(`SELECT * FROM ${table} WHERE id = ?`, [r.insertId])
    res.status(201).json({ row })
  })
  app.patch(`/api/admin/${path}/:id`, guard, async (req, res) => {
    const data = clean(req.body, true)
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' })
    const r = await query(`UPDATE ${table} SET ? WHERE id = ?`, [data, req.params.id])
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found' })
    const [row] = await query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id])
    res.json({ row })
  })
  app.delete(`/api/admin/${path}/:id`, guard, async (req, res) => {
    const r = await query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id])
    if (!r.affectedRows) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  })
}
const text = (max, required, msg) => (v) => {
  const s = str(v, max)
  return [s || null, required && !s ? msg : '']
}
const oneOf = (list) => (v) => [v, list.includes(v) ? '' : 'Choose a valid option']
const num = (min = 0) => (v) => {
  if (v === null || v === '' || v === undefined) return [null, '']
  const n = Number(v)
  return [n, Number.isFinite(n) && n >= min ? '' : 'Enter a valid number']
}

crud('vehicles', 'vehicles', {
  category: text(60, true, 'Enter a category'),
  model: text(120, true, 'Enter the model'),
  registration: (v) => { const s = str(v, 30).toUpperCase(); return [s, s ? '' : 'Enter the registration number'] },
  seats: num(1), luggage: num(0),
  status: oneOf(['active', 'maintenance', 'inactive']),
}, staff, 'category, model')

crud('drivers', 'drivers', {
  name: text(120, true, 'Enter the driver name'),
  phone: (v) => { const s = str(v, 20); return [s, isPhone(s) ? '' : 'Enter a 10-digit mobile number'] },
  license_no: text(40, false),
  status: oneOf(['available', 'on_trip', 'off_duty', 'inactive']),
}, staff, 'name')

crud('pricing', 'pricing', {
  trip_type: oneOf(TRIP_TYPES),
  vehicle_category: text(60, true, 'Enter a vehicle category'),
  base_fare: (v) => { const n = Number(v); return [n, Number.isFinite(n) && n >= 0 ? '' : 'Enter a base fare'] },
  per_km: num(0), per_hour: num(0), notes: text(255, false),
  active: (v) => [v === false || v === 0 || v === '0' ? 0 : 1, ''],
}, admin, 'trip_type, vehicle_category')

// ---------- Admin: enquiries ----------
app.get('/api/admin/enquiries', staff, async (req, res) => {
  const where = []
  const params = []
  if (['contact', 'corporate'].includes(req.query.type)) { where.push('type = ?'); params.push(req.query.type) }
  if (['new', 'in_progress', 'closed'].includes(req.query.status)) { where.push('status = ?'); params.push(req.query.status) }
  res.json({ rows: await query(`SELECT * FROM enquiries ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 500`, params) })
})
app.patch('/api/admin/enquiries/:id', staff, async (req, res) => {
  check({ status: [['new', 'in_progress', 'closed'].includes(req.body.status), 'Choose a valid status'] })
  const r = await query('UPDATE enquiries SET status = ? WHERE id = ?', [req.body.status, req.params.id])
  if (!r.affectedRows) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

// ---------- Admin: users and roles (admin only) ----------
app.get('/api/admin/users', admin, async (_req, res) => {
  res.json({ rows: await query("SELECT id, name, email, phone, role, created_at FROM users WHERE role <> 'customer' ORDER BY created_at") })
})
app.post('/api/admin/users', admin, async (req, res) => {
  const name = str(req.body.name, 120)
  const email = str(req.body.email, 190).toLowerCase()
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  check({
    name: [name.length >= 2, 'Enter a name'],
    email: [isEmail(email), 'Enter a valid email'],
    password: [password.length >= 10 && password.length <= 72, 'Use 10 to 72 characters'],
    role: [['staff', 'admin'].includes(req.body.role), 'Choose staff or admin'],
  })
  const [exists] = await query('SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ error: 'This email is already registered.', fields: { email: 'Already registered' } })
  const r = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, await bcrypt.hash(password, 12), req.body.role])
  res.status(201).json({ row: { id: r.insertId, name, email, role: req.body.role } })
})
app.patch('/api/admin/users/:id', admin, async (req, res) => {
  check({ role: [['customer', 'staff', 'admin'].includes(req.body.role), 'Choose a valid role'] })
  if (Number(req.params.id) === req.user.sub) return res.status(400).json({ error: "You can't change your own role." })
  const r = await query('UPDATE users SET role = ? WHERE id = ?', [req.body.role, req.params.id])
  if (!r.affectedRows) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

// ---------- Errors ----------
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err, _req, res, _next) => {
  if (err.status === 400 && err.fields) return res.status(400).json({ error: err.message, fields: err.fields })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' })
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That record already exists.' })
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' })
})
