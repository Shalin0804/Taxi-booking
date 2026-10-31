import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { STAFF_ROLES, audit, endSession, load, permissionsFor, publicUser, requireAdmin, revokeAllSessions, startSession } from '../auth.js'
import { checkPassword } from '../login.js'
import { check, isDate, isEmail, isPhone, normPhone, str, today } from '../validate.js'
import { TRIP_TYPES } from './customer.js'

const r = Router()
const loginLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 20, message: { error: 'Too many attempts. Try again in 15 minutes.' } })
const BOOKING_STATUS = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled']
// India-time calendar date a booking was made (created_at is stored in UTC).
const BOOKED_ON = "DATE(CONVERT_TZ(created_at, '+00:00', '+05:30'))"
const pw = (v) => (typeof v === 'string' ? v : '')
const me = (u) => ({ ...publicUser(u), permissions: permissionsFor(u.role) })

// ---------- Admin auth (separate cookie, staff roles only) ----------
r.post('/auth/login', loginLimiter, async (req, res) => {
  const email = str(req.body.email, 190).toLowerCase()
  const result = await checkPassword(`email = ? AND role IN (${STAFF_ROLES.map(() => '?').join(',')})`, [email, ...STAFF_ROLES], pw(req.body.password))
  if (result.error) {
    await audit(req, 'admin.login_failed', 'user', result.user?.id, { email })
    return res.status(result.status).json({ error: result.error })
  }
  await startSession(res, result.user, 'admin')
  req.user = result.user
  await audit(req, 'admin.login', 'user', result.user.id)
  res.json({ user: me(result.user) })
})

r.post('/auth/logout', async (req, res) => {
  await endSession(req, res, 'admin')
  res.json({ ok: true })
})

r.get('/auth/me', async (req, res) => {
  const u = await load(req, 'admin')
  res.json({ user: u ? me(u) : null })
})

r.post('/auth/password', requireAdmin(), async (req, res) => {
  const next = pw(req.body.newPassword)
  check({ newPassword: [next.length >= 10 && next.length <= 72, 'Use 10 to 72 characters'] })
  const [u] = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id])
  if (!(await bcrypt.compare(pw(req.body.currentPassword), u.password_hash))) {
    return res.status(400).json({ error: 'Your current password is incorrect.', fields: { currentPassword: 'Incorrect password' } })
  }
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(next, 12), req.user.id])
  await query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = ? AND id <> ? AND revoked_at IS NULL', [req.user.id, req.user.sid])
  await audit(req, 'admin.password_changed', 'user', req.user.id)
  res.json({ ok: true })
})

r.post('/auth/logout-everywhere', requireAdmin(), async (req, res) => {
  await revokeAllSessions(req.user.id, 'admin')
  await audit(req, 'admin.logout_everywhere', 'user', req.user.id)
  await endSession(req, res, 'admin')
  res.json({ ok: true })
})

// ---------- Overview ----------
r.get('/stats', requireAdmin('stats:read'), async (_req, res) => {
  const [counts] = await query(`SELECT
      (SELECT COUNT(*) FROM bookings) AS bookings,
      (SELECT COUNT(*) FROM bookings WHERE status = 'pending') AS pending,
      (SELECT COUNT(*) FROM bookings WHERE cancel_requested_at IS NOT NULL AND status NOT IN ('cancelled', 'completed')) AS cancel_requests,
      (SELECT COUNT(*) FROM bookings WHERE pickup_date = ? AND status <> 'cancelled') AS today,
      (SELECT COUNT(*) FROM enquiries WHERE status = 'new') AS new_enquiries,
      (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') AS customers,
      (SELECT COUNT(*) FROM vehicles WHERE status = 'active') AS active_vehicles,
      (SELECT COUNT(*) FROM drivers WHERE status = 'available') AS available_drivers`, [today()])
  const byStatus = await query('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status')
  const byDay = await query(`SELECT ${BOOKED_ON} AS day, COUNT(*) AS n FROM bookings
    WHERE ${BOOKED_ON} >= ? GROUP BY day ORDER BY day`, [today(-13)])
  const byTrip = await query('SELECT trip_type, COUNT(*) AS n FROM bookings GROUP BY trip_type ORDER BY n DESC')
  const recent = await query('SELECT id, reference, name, trip_type, pickup_date, status FROM bookings ORDER BY created_at DESC LIMIT 6')
  res.json({ counts, byStatus, byDay, byTrip, recent })
})

// ---------- Reports ----------
// basis=booked (default) groups by the India-time date the booking was made; basis=pickup by trip date.
r.get('/reports', requireAdmin('reports:read'), async (req, res) => {
  const basis = req.query.basis === 'pickup' ? 'pickup' : 'booked'
  const from = isDate(req.query.from) ? req.query.from : today(-29)
  const to = isDate(req.query.to) ? req.query.to : today()
  const col = basis === 'pickup' ? 'b.pickup_date' : BOOKED_ON.replace(/created_at/g, 'b.created_at')
  const range = `${col} BETWEEN ? AND ?`
  const p = [from, to]
  const [totals] = await query(`SELECT COUNT(*) AS bookings,
      COALESCE(SUM(b.status = 'completed'), 0) AS completed,
      COALESCE(SUM(b.status = 'cancelled'), 0) AS cancelled,
      COALESCE(SUM(b.status IN ('pending', 'confirmed', 'assigned', 'in_progress')), 0) AS open,
      COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.fare END), 0) AS revenue,
      COALESCE(SUM(CASE WHEN b.status NOT IN ('cancelled', 'completed') THEN b.fare END), 0) AS expected,
      COUNT(DISTINCT b.user_id) AS customers
    FROM bookings b WHERE ${range}`, p)
  const byStatus = await query(`SELECT b.status AS label, COUNT(*) AS n FROM bookings b WHERE ${range} GROUP BY b.status ORDER BY n DESC`, p)
  const byTrip = await query(`SELECT b.trip_type AS label, COUNT(*) AS n, COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.fare END), 0) AS revenue
    FROM bookings b WHERE ${range} GROUP BY b.trip_type ORDER BY n DESC`, p)
  const byVehicle = await query(`SELECT COALESCE(b.vehicle_pref, 'Not specified') AS label, COUNT(*) AS n FROM bookings b WHERE ${range} GROUP BY label ORDER BY n DESC`, p)
  const byDriver = await query(`SELECT d.name AS label, COUNT(*) AS n FROM bookings b JOIN drivers d ON d.id = b.driver_id
    WHERE ${range} AND b.status NOT IN ('cancelled') GROUP BY d.id, d.name ORDER BY n DESC LIMIT 10`, p)
  res.json({ basis, from, to, totals, byStatus, byTrip, byVehicle, byDriver })
})

// ---------- Bookings ----------
function bookingFilter(q) {
  const where = []
  const params = []
  if (BOOKING_STATUS.includes(q.status)) { where.push('b.status = ?'); params.push(q.status) }
  if (q.cancel === '1') where.push("b.cancel_requested_at IS NOT NULL AND b.status NOT IN ('cancelled', 'completed')")
  if (TRIP_TYPES.includes(q.trip)) { where.push('b.trip_type = ?'); params.push(q.trip) }
  // Date range applies to the pickup date, or to the India-time booking date with basis=booked (as in Reports).
  const col = q.basis === 'booked' ? BOOKED_ON.replace(/created_at/g, 'b.created_at') : 'b.pickup_date'
  if (isDate(q.from)) { where.push(`${col} >= ?`); params.push(q.from) }
  if (isDate(q.to)) { where.push(`${col} <= ?`); params.push(q.to) }
  const s = str(q.q, 80)
  if (s) {
    where.push('(b.reference LIKE ? OR b.name LIKE ? OR b.phone LIKE ? OR b.pickup LIKE ? OR b.dropoff LIKE ?)')
    params.push(...Array(5).fill(`%${s}%`))
  }
  return { sql: where.length ? 'WHERE ' + where.join(' AND ') : '', params }
}
const BOOKING_SQL = `SELECT b.*, d.name AS driver_name, v.model AS vehicle_model, v.registration, u.email AS account_email
  FROM bookings b LEFT JOIN drivers d ON d.id = b.driver_id LEFT JOIN vehicles v ON v.id = b.vehicle_id LEFT JOIN users u ON u.id = b.user_id`

r.get('/bookings', requireAdmin('bookings:read'), async (req, res) => {
  const { sql, params } = bookingFilter(req.query)
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM bookings b ${sql}`, params)
  const rows = await query(`${BOOKING_SQL} ${sql} ORDER BY b.created_at DESC LIMIT 20 OFFSET ?`, [...params, (page - 1) * 20])
  res.json({ rows, total, page, pageSize: 20 })
})

r.get('/bookings/:id', requireAdmin('bookings:read'), async (req, res) => {
  const [row] = await query(`${BOOKING_SQL} WHERE b.id = ?`, [req.params.id])
  if (!row) return res.status(404).json({ error: 'Booking not found' })
  res.json({ row })
})

r.patch('/bookings/:id', requireAdmin('bookings:write'), async (req, res) => {
  const b = req.body
  const sets = []
  const params = []
  const changes = {}
  if (b.status !== undefined) {
    check({ status: [BOOKING_STATUS.includes(b.status), 'Unknown status'] })
    sets.push('status = ?'); params.push(b.status); changes.status = b.status
  }
  for (const k of ['driver_id', 'vehicle_id']) {
    if (b[k] === undefined) continue
    const id = b[k] === null || b[k] === '' ? null : parseInt(b[k])
    if (id !== null) {
      const [exists] = await query(`SELECT id FROM ${k === 'driver_id' ? 'drivers' : 'vehicles'} WHERE id = ?`, [id])
      check({ [k]: [!!exists, 'Not found'] })
    }
    sets.push(`${k} = ?`); params.push(id); changes[k] = id
  }
  if (b.fare !== undefined) {
    const fare = b.fare === null || b.fare === '' ? null : Number(b.fare)
    check({ fare: [fare === null || (Number.isFinite(fare) && fare >= 0), 'Enter a valid amount'] })
    sets.push('fare = ?'); params.push(fare); changes.fare = fare
  }
  if (b.admin_notes !== undefined) { sets.push('admin_notes = ?'); params.push(str(b.admin_notes, 2000) || null) }
  if (b.clear_cancel_request) sets.push('cancel_requested_at = NULL')
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  const upd = await query(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?`, [...params, req.params.id])
  if (!upd.affectedRows) return res.status(404).json({ error: 'Booking not found' })
  await audit(req, 'booking.update', 'booking', req.params.id, changes)
  const [row] = await query(`${BOOKING_SQL} WHERE b.id = ?`, [req.params.id])
  res.json({ row })
})

// CSV opens directly in Excel. Cells starting with = + - @ are prefixed so they can't run as formulas.
const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
r.get('/bookings.csv', requireAdmin('bookings:export'), async (req, res) => {
  const { sql, params } = bookingFilter(req.query)
  const rows = await query(`${BOOKING_SQL} ${sql} ORDER BY b.created_at DESC LIMIT 10000`, params)
  const cols = ['reference', 'status', 'trip_type', 'pickup', 'dropoff', 'pickup_date', 'pickup_time', 'return_date', 'vehicle_pref',
    'passengers', 'name', 'phone', 'email', 'account_email', 'driver_name', 'vehicle_model', 'registration', 'fare', 'notes', 'admin_notes', 'created_at']
  await audit(req, 'booking.export', 'booking', null, { filters: req.query, rows: rows.length })
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="tttcabs-bookings-${today()}.csv"`)
  res.send('﻿' + [cols.join(','), ...rows.map((x) => cols.map((c) => csvCell(x[c])).join(','))].join('\r\n'))
})

// ---------- Customers ----------
r.get('/customers', requireAdmin('customers:read'), async (req, res) => {
  const s = str(req.query.q, 80)
  const rows = await query(`SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at, COUNT(b.id) AS bookings
    FROM users u LEFT JOIN bookings b ON b.user_id = u.id WHERE u.role = 'CUSTOMER'
    ${s ? 'AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)' : ''}
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`, s ? Array(3).fill(`%${s}%`) : [])
  res.json({ rows })
})

r.patch('/customers/:id', requireAdmin('customers:write'), async (req, res) => {
  check({ status: [['active', 'disabled'].includes(req.body.status), 'Choose active or disabled'] })
  const upd = await query("UPDATE users SET status = ? WHERE id = ? AND role = 'CUSTOMER'", [req.body.status, req.params.id])
  if (!upd.affectedRows) return res.status(404).json({ error: 'Customer not found' })
  if (req.body.status === 'disabled') await revokeAllSessions(req.params.id)
  await audit(req, 'customer.status', 'user', req.params.id, { status: req.body.status })
  res.json({ ok: true })
})

// ---------- Generic CRUD: vehicles, drivers, pricing ----------
/** fields: { column: (value) => [cleanValue, errorMessage|''] } */
function crud(path, table, fields, readPerm, writePerm, order) {
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
  r.get(`/${path}`, requireAdmin(readPerm, writePerm), async (_req, res) => res.json({ rows: await query(`SELECT * FROM ${table} ORDER BY ${order}`) }))
  r.post(`/${path}`, requireAdmin(writePerm), async (req, res) => {
    const data = clean(req.body, false)
    const ins = await query(`INSERT INTO ${table} SET ?`, [data])
    await audit(req, `${table}.create`, table, ins.insertId, data)
    const [row] = await query(`SELECT * FROM ${table} WHERE id = ?`, [ins.insertId])
    res.status(201).json({ row })
  })
  r.patch(`/${path}/:id`, requireAdmin(writePerm), async (req, res) => {
    const data = clean(req.body, true)
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' })
    const upd = await query(`UPDATE ${table} SET ? WHERE id = ?`, [data, req.params.id])
    if (!upd.affectedRows) return res.status(404).json({ error: 'Not found' })
    await audit(req, `${table}.update`, table, req.params.id, data)
    const [row] = await query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id])
    res.json({ row })
  })
  r.delete(`/${path}/:id`, requireAdmin(writePerm), async (req, res) => {
    const del = await query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id])
    if (!del.affectedRows) return res.status(404).json({ error: 'Not found' })
    await audit(req, `${table}.delete`, table, req.params.id)
    res.json({ ok: true })
  })
}
const text = (max, required, msg) => (v) => { const s = str(v, max); return [s || null, required && !s ? msg : ''] }
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
}, 'fleet:read', 'fleet:write', 'category, model')

crud('drivers', 'drivers', {
  name: text(120, true, 'Enter the driver name'),
  phone: (v) => { const s = normPhone(v); return [s, isPhone(s) ? '' : 'Enter a 10-digit mobile number'] },
  license_no: text(40, false),
  status: oneOf(['available', 'on_trip', 'off_duty', 'inactive']),
}, 'fleet:read', 'fleet:write', 'name')

crud('pricing', 'pricing', {
  trip_type: oneOf(TRIP_TYPES),
  vehicle_category: text(60, true, 'Enter a vehicle category'),
  base_fare: (v) => { const n = Number(v); return [n, v !== '' && Number.isFinite(n) && n >= 0 ? '' : 'Enter a base fare'] },
  per_km: num(0), per_hour: num(0), notes: text(255, false),
  active: (v) => [v === false || v === 0 || v === '0' ? 0 : 1, ''],
}, 'pricing:read', 'pricing:write', 'trip_type, vehicle_category')

// ---------- Enquiries ----------
r.get('/enquiries', requireAdmin('enquiries:read'), async (req, res) => {
  const where = []
  const params = []
  if (['contact', 'corporate'].includes(req.query.type)) { where.push('type = ?'); params.push(req.query.type) }
  if (['new', 'in_progress', 'closed'].includes(req.query.status)) { where.push('status = ?'); params.push(req.query.status) }
  res.json({ rows: await query(`SELECT * FROM enquiries ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 500`, params) })
})
r.patch('/enquiries/:id', requireAdmin('enquiries:write'), async (req, res) => {
  check({ status: [['new', 'in_progress', 'closed'].includes(req.body.status), 'Choose a valid status'] })
  const upd = await query('UPDATE enquiries SET status = ? WHERE id = ?', [req.body.status, req.params.id])
  if (!upd.affectedRows) return res.status(404).json({ error: 'Not found' })
  await audit(req, 'enquiry.status', 'enquiry', req.params.id, { status: req.body.status })
  res.json({ ok: true })
})

// ---------- Team (SUPER_ADMIN only) ----------
r.get('/users', requireAdmin('users:manage'), async (_req, res) => {
  res.json({ rows: await query("SELECT id, name, email, role, status, created_at FROM users WHERE role <> 'CUSTOMER' ORDER BY created_at") })
})

r.post('/users', requireAdmin('users:manage'), async (req, res) => {
  const name = str(req.body.name, 120)
  const email = str(req.body.email, 190).toLowerCase()
  const password = pw(req.body.password)
  check({
    name: [name.length >= 2, 'Enter a name'],
    email: [isEmail(email), 'Enter a valid email'],
    password: [password.length >= 10 && password.length <= 72, 'Use 10 to 72 characters'],
    role: [STAFF_ROLES.includes(req.body.role), 'Choose a staff role'],
  })
  const [exists] = await query('SELECT id FROM users WHERE email = ?', [email])
  if (exists) return res.status(409).json({ error: 'This email is already registered.', fields: { email: 'Already registered' } })
  const ins = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name, email, await bcrypt.hash(password, 12), req.body.role])
  await audit(req, 'team.create', 'user', ins.insertId, { email, role: req.body.role })
  res.status(201).json({ row: { id: ins.insertId, name, email, role: req.body.role, status: 'active' } })
})

r.patch('/users/:id', requireAdmin('users:manage'), async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.user.id) return res.status(400).json({ error: "You can't change your own role or status." })
  const [target] = await query("SELECT id, role, status FROM users WHERE id = ? AND role <> 'CUSTOMER'", [id])
  if (!target) return res.status(404).json({ error: 'Team member not found' })
  const role = req.body.role ?? target.role
  const status = req.body.status ?? target.status
  check({ role: [STAFF_ROLES.includes(role), 'Choose a staff role'], status: [['active', 'disabled'].includes(status), 'Choose active or disabled'] })
  await query('UPDATE users SET role = ?, status = ? WHERE id = ?', [role, status, id])
  if (status === 'disabled') await revokeAllSessions(id)
  await audit(req, 'team.update', 'user', id, { role, status })
  res.json({ ok: true })
})

// TEMPORARY (remove after reading): which proxy headers reach the API, to pick the real client IP.
r.get('/debug/ip', requireAdmin('users:manage'), (req, res) => {
  const pick = ['x-forwarded-for', 'x-real-ip', 'x-vercel-forwarded-for', 'x-vercel-ip-country', 'cf-connecting-ip', 'true-client-ip', 'x-forwarded-host', 'cf-ipcountry', 'via']
  res.json({ ip: req.ip, ips: req.ips, remote: req.socket.remoteAddress, headers: Object.fromEntries(pick.map((h) => [h, req.get(h) ?? null])) })
})

r.get('/audit', requireAdmin('audit:read'), async (_req, res) => {
  res.json({ rows: await query(`SELECT a.*, u.email AS user_email FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 300`) })
})

export default r
