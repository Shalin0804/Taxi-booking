// End-to-end API checks against a real MySQL database. Point DATABASE_URL at a TEST database:
// it creates users, bookings and enquiries.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { app } from '../src/app.js'
import { migrate, pool, query } from '../src/db.js'

let base, server
const run = Date.now().toString(36)
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  })
  const type = res.headers.get('content-type') || ''
  return { status: res.status, data: type.includes('json') ? await res.json() : await res.text() }
}

before(async () => {
  await migrate()
  server = app.listen(0)
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => { server.close(); await pool.end() })

const booking = (o = {}) => ({ trip: 'Airport transfer', pickup: 'Pune', drop: 'Pune Airport', date: day(2), time: '09:30',
  vehicle: 'Sedan', passengers: '2', name: 'Test Customer', phone: '9876543210', ...o })

test('signup, duplicate, login and me', async () => {
  const email = `cust-${run}@example.test`
  const bad = await api('/api/auth/signup', { method: 'POST', body: { name: 'A', email: 'nope', phone: '1', password: 'short' } })
  assert.equal(bad.status, 400)
  assert.deepEqual(Object.keys(bad.data.fields).sort(), ['email', 'name', 'password', 'phone'])

  const ok = await api('/api/auth/signup', { method: 'POST', body: { name: 'Test Customer', email, phone: '9876543210', password: 'goodpassword' } })
  assert.equal(ok.status, 201)
  assert.equal(ok.data.user.role, 'customer')
  assert.equal(ok.data.user.password_hash, undefined)

  assert.equal((await api('/api/auth/signup', { method: 'POST', body: { name: 'X Y', email, phone: '9876543210', password: 'goodpassword' } })).status, 409)
  assert.equal((await api('/api/auth/login', { method: 'POST', body: { email, password: 'wrongpassword' } })).status, 401)
  const login = await api('/api/auth/login', { method: 'POST', body: { email: email.toUpperCase(), password: 'goodpassword' } })
  assert.equal(login.status, 200)
  assert.equal((await api('/api/auth/me', { token: login.data.token })).data.user.email, email)
  assert.equal((await api('/api/auth/me', { token: 'garbage' })).status, 401)
})

test('booking validation and guest booking', async () => {
  const past = await api('/api/bookings', { method: 'POST', body: booking({ date: day(-1), phone: '123' }) })
  assert.equal(past.status, 400)
  assert.ok(past.data.fields.date && past.data.fields.phone)
  assert.equal((await api('/api/bookings', { method: 'POST', body: booking({ trip: 'Teleport' }) })).status, 400)
  const ok = await api('/api/bookings', { method: 'POST', body: booking() })
  assert.equal(ok.status, 201)
  assert.match(ok.data.reference, /^TTT-[0-9A-F]{8}$/)
})

test('customer flow: book, admin confirms and assigns, customer sees it; roles enforced', async () => {
  const cust = (await api('/api/auth/signup', { method: 'POST', body: { name: 'Flow User', email: `flow-${run}@example.test`, phone: '9876501234', password: 'goodpassword' } })).data
  const { reference } = (await api('/api/bookings', { method: 'POST', token: cust.token, body: booking({ trip: 'Outstation round trip', drop: 'Mumbai', returnDate: day(4) }) })).data

  // Customers can't reach admin endpoints; anonymous users get 401.
  assert.equal((await api('/api/admin/bookings', { token: cust.token })).status, 403)
  assert.equal((await api('/api/admin/bookings')).status, 401)

  // Test-only admin, created directly in the test database.
  const email = `admin-${run}@example.test`
  await query("INSERT INTO users (name, email, password_hash, role) VALUES ('Test Admin', ?, ?, 'admin')", [email, await bcrypt.hash('adminpassword1', 4)])
  const adm = (await api('/api/auth/login', { method: 'POST', body: { email, password: 'adminpassword1' } })).data.token

  const driver = (await api('/api/admin/drivers', { method: 'POST', token: adm, body: { name: 'Test Driver', phone: '9123456780', status: 'available' } })).data.row
  const vehicle = (await api('/api/admin/vehicles', { method: 'POST', token: adm, body: { category: 'SUV', model: 'Test Model', registration: `mh12${run}`, seats: 7, status: 'active' } })).data.row
  assert.equal(vehicle.registration, `MH12${run}`.toUpperCase())
  assert.equal((await api('/api/admin/vehicles', { method: 'POST', token: adm, body: { category: 'SUV', model: 'Dup', registration: `MH12${run}`, status: 'active' } })).status, 409)

  const found = (await api(`/api/admin/bookings?q=${reference}`, { token: adm })).data
  assert.equal(found.total, 1)
  const id = found.rows[0].id
  const upd = await api(`/api/admin/bookings/${id}`, { method: 'PATCH', token: adm, body: { status: 'assigned', driver_id: driver.id, vehicle_id: vehicle.id, fare: 4500 } })
  assert.equal(upd.status, 200)
  assert.equal(upd.data.row.driver_name, 'Test Driver')
  assert.equal((await api(`/api/admin/bookings/${id}`, { method: 'PATCH', token: adm, body: { driver_id: 999999 } })).status, 400)

  const mine = (await api('/api/my/bookings', { token: cust.token })).data.rows
  assert.equal(mine.length, 1)
  assert.equal(mine[0].status, 'assigned')
  assert.equal(mine[0].driver_name, 'Test Driver')
  assert.equal(mine[0].vehicle_model, 'Test Model')
  // Assigned trips can't be cancelled online.
  assert.equal((await api(`/api/my/bookings/${reference}/cancel`, { method: 'POST', token: cust.token })).status, 409)

  const stats = (await api('/api/admin/stats', { token: adm })).data
  assert.ok(stats.counts.bookings >= 2)

  const csv = await api(`/api/admin/bookings.csv?q=${reference}`, { token: adm })
  assert.equal(csv.status, 200)
  assert.match(csv.data, /reference,status,trip_type/)
  assert.ok(csv.data.includes(reference))

  // Pricing is admin-only: staff can't edit it.
  const staffEmail = `staff-${run}@example.test`
  assert.equal((await api('/api/admin/users', { method: 'POST', token: adm, body: { name: 'Test Staff', email: staffEmail, password: 'staffpassword1', role: 'staff' } })).status, 201)
  const stf = (await api('/api/auth/login', { method: 'POST', body: { email: staffEmail, password: 'staffpassword1' } })).data.token
  assert.equal((await api('/api/admin/pricing', { token: stf })).status, 403)
  assert.equal((await api('/api/admin/bookings', { token: stf })).status, 200)
  const price = await api('/api/admin/pricing', { method: 'POST', token: adm, body: { trip_type: 'Airport transfer', vehicle_category: `Sedan-${run}`, base_fare: 999 } })
  assert.equal(price.status, 201)
})

test('enquiries and CSV formula escaping', async () => {
  assert.equal((await api('/api/enquiries', { method: 'POST', body: { type: 'corporate', contact: 'A B', email: 'a@b.co', phone: '9876543210', requirements: 'short' } })).status, 400)
  assert.equal((await api('/api/enquiries', { method: 'POST', body: { type: 'corporate', company: 'Acme', contact: 'A B', email: 'a@b.co', phone: '9876543210', employees: '26–100', requirements: 'Daily commute for 40 staff' } })).status, 201)
  const evil = (await api('/api/bookings', { method: 'POST', body: booking({ name: '=HYPERLINK("x")' }) })).data.reference
  const email = `admin-${run}@example.test`
  const adm = (await api('/api/auth/login', { method: 'POST', body: { email, password: 'adminpassword1' } })).data.token
  const csv = (await api(`/api/admin/bookings.csv?q=${evil}`, { token: adm })).data
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`), 'formula cell must be neutralised')
})
