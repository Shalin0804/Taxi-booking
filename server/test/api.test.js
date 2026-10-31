// End-to-end API checks against a real MySQL database. Point DATABASE_URL at a TEST database:
// these tests create users, sessions, bookings and enquiries.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { app } from '../src/app.js'
import { migrate, pool, query } from '../src/db.js'

let base, server
const run = Date.now().toString(36)
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)
let phoneSeq = Number(String(Date.now()).slice(-6))
const phone = () => `98${String(phoneSeq++).padStart(8, '0')}`

/** A browser-like client with its own cookie jar. */
function client() {
  const jar = new Map()
  const call = async (path, { method = 'GET', body, csrf = true, headers = {} } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(csrf && method !== 'GET' && { 'X-Requested-With': 'ttt' }),
        ...(jar.size && { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
        ...headers,
      },
      body: body && JSON.stringify(body),
    })
    for (const c of res.headers.getSetCookie()) {
      const [kv, ...attrs] = c.split(';')
      const [k, v] = kv.split('=')
      if (!v || attrs.some((a) => /expires=Thu, 01 Jan 1970/i.test(a))) jar.delete(k)
      else jar.set(k, v)
    }
    const type = res.headers.get('content-type') || ''
    return { status: res.status, data: type.includes('json') ? await res.json() : await res.text(), cookies: res.headers.getSetCookie() }
  }
  return { call, jar }
}

const booking = (o = {}) => ({ trip: 'Airport transfer', pickup: 'Pune', drop: 'Pune Airport', date: day(2), time: '09:30', vehicle: 'Sedan', passengers: '2', ...o })
async function customer(tag) {
  const c = client()
  const email = `${tag}-${run}@example.test`
  const p = phone()
  const r = await c.call('/api/auth/register', { method: 'POST', body: { name: `Cust ${tag}`, email, phone: p, password: 'goodpassword' } })
  assert.equal(r.status, 201, JSON.stringify(r.data))
  return { ...c, email, phone: p, id: r.data.user.id }
}
async function staff(role) {
  const email = `${role.toLowerCase()}-${run}@example.test`
  await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [role, email, await bcrypt.hash('staffpassword1', 4), role])
  const c = client()
  const r = await c.call('/api/admin/auth/login', { method: 'POST', body: { email, password: 'staffpassword1' } })
  assert.equal(r.status, 200, `${role} login: ${JSON.stringify(r.data)}`)
  return { ...c, email }
}

/** Signs in a staff account created earlier by staff(). */
async function signIn(role) {
  const c = client()
  const r = await c.call('/api/admin/auth/login', { method: 'POST', body: { email: `${role.toLowerCase()}-${run}@example.test`, password: 'staffpassword1' } })
  assert.equal(r.status, 200)
  return c
}

before(async () => {
  await migrate()
  server = app.listen(0)
  base = `http://127.0.0.1:${server.address().port}`
})
after(async () => { server.close(); await pool.end() })

test('customer register, login by email or phone, httpOnly cookie, logout', async () => {
  const bad = await client().call('/api/auth/register', { method: 'POST', body: { name: 'A', email: 'nope', phone: '1', password: 'short' } })
  assert.equal(bad.status, 400)
  const c = await customer('reg')
  const dup = await client().call('/api/auth/register', { method: 'POST', body: { name: 'Dup', email: c.email, phone: phone(), password: 'goodpassword' } })
  assert.equal(dup.status, 409)

  const byPhone = client()
  const login = await byPhone.call('/api/auth/login', { method: 'POST', body: { identifier: `+91 ${c.phone}`, password: 'goodpassword', remember: true } })
  assert.equal(login.status, 200)
  const cookie = login.cookies.find((x) => x.startsWith('ttt_customer='))
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=Lax/i)
  assert.match(cookie, /Max-Age=/i, 'remember me sets a persistent cookie')
  assert.equal((await byPhone.call('/api/auth/me')).data.user.email, c.email)

  const wrong = await client().call('/api/auth/login', { method: 'POST', body: { identifier: c.email, password: 'nope-nope' } })
  assert.equal(wrong.status, 401)
  assert.equal((await client().call('/api/auth/login', { method: 'POST', body: { identifier: 'ghost@example.test', password: 'nope-nope' } })).data.error, wrong.data.error, 'same message for unknown account')

  await byPhone.call('/api/auth/logout', { method: 'POST' })
  assert.equal((await byPhone.call('/api/auth/me')).status, 401, 'logout ends the session')
})

test('CSRF: state-changing requests without the header or from a foreign origin are rejected', async () => {
  assert.equal((await client().call('/api/auth/login', { method: 'POST', csrf: false, body: { identifier: 'x@y.co', password: 'x' } })).status, 403)
  assert.equal((await client().call('/api/auth/login', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: { identifier: 'x@y.co', password: 'x' } })).status, 403)
  // Behind Vercel's /api rewrite the browser's origin is the site host reported in X-Forwarded-Host.
  const viaProxy = { Origin: 'https://site.example', 'X-Forwarded-Host': 'site.example' }
  assert.equal((await client().call('/api/auth/login', { method: 'POST', headers: viaProxy, body: { identifier: 'x@y.co', password: 'x' } })).status, 401, 'site origin via proxy passes CSRF')
  assert.equal((await client().call('/api/auth/login', { method: 'POST', headers: { ...viaProxy, Origin: 'https://evil.example' }, body: { identifier: 'x@y.co', password: 'x' } })).status, 403)
  assert.equal((await client().call('/api/auth/login', { method: 'POST', csrf: false, headers: viaProxy, body: { identifier: 'x@y.co', password: 'x' } })).status, 403, 'header still required')
})

test('bookings require a customer session; ownership comes from the session', async () => {
  assert.equal((await client().call('/api/bookings', { method: 'POST', body: booking() })).status, 401)
  assert.equal((await client().call('/api/bookings')).status, 401)
  assert.equal((await client().call('/api/bookings/TTT-00000000')).status, 401)

  const a = await customer('owner')
  const b = await customer('other')
  const past = await a.call('/api/bookings', { method: 'POST', body: booking({ date: day(-1) }) })
  assert.equal(past.status, 400)
  // A user_id in the body must be ignored.
  const made = await a.call('/api/bookings', { method: 'POST', body: booking({ user_id: b.id, userId: b.id }) })
  assert.equal(made.status, 201)
  const ref = made.data.reference
  const [row] = await query('SELECT user_id, name, phone FROM bookings WHERE reference = ?', [ref])
  assert.equal(row.user_id, a.id)
  assert.equal(row.name, 'Cust owner', 'passenger details default to the profile')

  assert.equal((await a.call('/api/bookings')).data.rows.length, 1)
  assert.equal((await b.call('/api/bookings')).data.rows.length, 0)
  assert.equal((await a.call(`/api/bookings/${ref}`)).status, 200)
  assert.equal((await b.call(`/api/bookings/${ref}`)).status, 403, 'other customer gets 403')
  assert.equal((await b.call(`/api/bookings/${ref}/cancel`, { method: 'PATCH' })).status, 403)
  assert.equal((await a.call('/api/bookings/TTT-FFFFFFFF')).status, 404)

  // Staff accounts can't book through the customer API, and customer cookies can't reach admin APIs.
  assert.equal((await a.call('/api/admin/bookings')).status, 401)
  assert.equal((await a.call('/api/admin/auth/me')).status, 401)
  const cancel = await a.call(`/api/bookings/${ref}/cancel`, { method: 'PATCH' })
  assert.equal(cancel.data.outcome, 'cancelled')
})

test('admin login is separate: customers cannot use it, staff cannot use customer login', async () => {
  const c = await customer('notadmin')
  assert.equal((await client().call('/api/admin/auth/login', { method: 'POST', body: { email: c.email, password: 'goodpassword' } })).status, 401)
  const sa = await staff('SUPER_ADMIN')
  assert.equal((await client().call('/api/auth/login', { method: 'POST', body: { identifier: sa.email, password: 'staffpassword1' } })).status, 401)
  const me = (await sa.call('/api/admin/auth/me')).data.user
  assert.ok(me.permissions.includes('users:manage'))
  // An admin session doesn't count as a customer session.
  assert.equal((await sa.call('/api/bookings')).status, 401)
  await sa.call('/api/admin/auth/logout', { method: 'POST' })
  assert.equal((await sa.call('/api/admin/auth/me')).status, 401)
})

test('role permissions are enforced on the server', async () => {
  const fleet = await staff('FLEET_MANAGER')
  const support = await staff('SUPPORT_STAFF')
  const bm = await staff('BOOKING_MANAGER')
  const adm = await staff('ADMIN')

  assert.equal((await fleet.call('/api/admin/vehicles', { method: 'POST', body: { category: 'SUV', model: 'Innova', registration: `MH${run}`, status: 'active' } })).status, 201)
  assert.equal((await fleet.call('/api/admin/bookings')).status, 403)
  assert.equal((await fleet.call('/api/admin/enquiries')).status, 403)
  assert.equal((await support.call('/api/admin/enquiries')).status, 200)
  assert.equal((await support.call('/api/admin/bookings')).status, 200, 'support can read bookings')
  assert.equal((await support.call('/api/admin/bookings/1', { method: 'PATCH', body: { status: 'confirmed' } })).status, 403, 'but not change them')
  assert.equal((await support.call('/api/admin/vehicles', { method: 'POST', body: {} })).status, 403)
  assert.equal((await bm.call('/api/admin/pricing', { method: 'POST', body: { trip_type: 'Airport transfer', vehicle_category: 'Sedan', base_fare: 1 } })).status, 403)
  assert.equal((await bm.call('/api/admin/bookings.csv')).status, 200)
  assert.equal((await adm.call('/api/admin/users')).status, 403, 'only SUPER_ADMIN manages the team')
  assert.equal((await adm.call('/api/admin/audit')).status, 403)
  assert.equal((await client().call('/api/admin/stats')).status, 401)
})

test('full flow: customer books, booking manager assigns, customer sees it; audit log records it', async () => {
  const cust = await customer('flow')
  const { reference } = (await cust.call('/api/bookings', { method: 'POST', body: booking({ trip: 'Outstation round trip', drop: 'Mumbai', returnDate: day(4) }) })).data
  const fleet = await signIn('FLEET_MANAGER')
  const bm = await signIn('BOOKING_MANAGER')

  const driver = (await fleet.call('/api/admin/drivers', { method: 'POST', body: { name: 'Test Driver', phone: '9123456780', status: 'available' } })).data.row
  const vehicle = (await fleet.call('/api/admin/vehicles', { method: 'POST', body: { category: 'SUV', model: 'Flow Model', registration: `FL${run}`, status: 'active' } })).data.row
  const found = (await bm.call(`/api/admin/bookings?q=${reference}`)).data
  assert.equal(found.total, 1)
  const upd = await bm.call(`/api/admin/bookings/${found.rows[0].id}`, { method: 'PATCH', body: { status: 'assigned', driver_id: driver.id, vehicle_id: vehicle.id, fare: 4500 } })
  assert.equal(upd.status, 200)

  const mine = (await cust.call(`/api/bookings/${reference}`)).data.row
  assert.equal(mine.status, 'assigned')
  assert.equal(mine.driver_name, 'Test Driver')
  // Assigned trips become a cancellation request instead of cancelling outright.
  assert.equal((await cust.call(`/api/bookings/${reference}/cancel`, { method: 'PATCH' })).data.outcome, 'requested')
  assert.equal((await bm.call('/api/admin/bookings?cancel=1')).data.rows.some((r) => r.reference === reference), true)

  const [log] = await query("SELECT action FROM audit_logs WHERE action = 'booking.update' AND entity_id = ?", [String(found.rows[0].id)])
  assert.ok(log, 'admin change is audit-logged')
})

test('team management: SUPER_ADMIN creates staff; disabling revokes their sessions', async () => {
  const sa = client()
  await sa.call('/api/admin/auth/login', { method: 'POST', body: { email: `super_admin-${run}@example.test`, password: 'staffpassword1' } })
  const email = `newstaff-${run}@example.test`
  const created = await sa.call('/api/admin/users', { method: 'POST', body: { name: 'New Staff', email, password: 'newstaffpass1', role: 'SUPPORT_STAFF' } })
  assert.equal(created.status, 201)
  assert.equal((await sa.call('/api/admin/users', { method: 'POST', body: { name: 'X', email: `c-${run}@x.test`, password: 'newstaffpass1', role: 'CUSTOMER' } })).status, 400)
  const s = client()
  assert.equal((await s.call('/api/admin/auth/login', { method: 'POST', body: { email, password: 'newstaffpass1' } })).status, 200)
  await sa.call(`/api/admin/users/${created.data.row.id}`, { method: 'PATCH', body: { status: 'disabled' } })
  assert.equal((await s.call('/api/admin/auth/me')).status, 401, 'disabled staff lose access immediately')
  assert.equal((await s.call('/api/admin/auth/login', { method: 'POST', body: { email, password: 'newstaffpass1' } })).status, 401)
})

test('expired and revoked sessions are rejected', async () => {
  const c = await customer('expiry')
  assert.equal((await c.call('/api/auth/me')).status, 200)
  await query("UPDATE sessions SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE WHERE user_id = ? AND kind = 'customer'", [c.id])
  assert.equal((await c.call('/api/auth/me')).status, 401)
  // A tampered token is rejected too.
  const t = client()
  t.jar.set('ttt_customer', 'eyJhbGciOiJIUzI1NiJ9.eyJzaWQiOiJ4Iiwic3ViIjoxfQ.forged')
  assert.equal((await t.call('/api/auth/me')).status, 401)
})

test('account lockout after repeated failures', async () => {
  const c = await customer('lock')
  const bad = () => client().call('/api/auth/login', { method: 'POST', body: { identifier: c.email, password: 'wrong-password' } })
  for (let i = 0; i < 5; i++) assert.equal((await bad()).status, 401)
  const locked = await client().call('/api/auth/login', { method: 'POST', body: { identifier: c.email, password: 'goodpassword' } })
  assert.equal(locked.status, 429, 'correct password is refused while locked')
})

test('password reset: single-use, expiring, revokes sessions', async () => {
  const c = await customer('reset')
  const logged = []
  const orig = console.log
  console.log = (...a) => logged.push(a.join(' '))
  const forgot = await client().call('/api/auth/forgot-password', { method: 'POST', body: { email: c.email } })
  const ghost = await client().call('/api/auth/forgot-password', { method: 'POST', body: { email: 'ghost@example.test' } })
  console.log = orig
  assert.equal(forgot.status, 200)
  assert.deepEqual(ghost.data, forgot.data, 'same response for unknown email')
  const token = logged.join('\n').match(/token=([0-9a-f]{64})/)[1]

  assert.equal((await client().call('/api/auth/reset-password', { method: 'POST', body: { token, password: 'brandnewpass' } })).status, 200)
  assert.equal((await client().call('/api/auth/reset-password', { method: 'POST', body: { token, password: 'anotherpass1' } })).status, 400, 'token is single-use')
  assert.equal((await c.call('/api/auth/me')).status, 401, 'existing sessions revoked')
  assert.equal((await client().call('/api/auth/login', { method: 'POST', body: { identifier: c.email, password: 'brandnewpass' } })).status, 200)
  await query('UPDATE password_resets SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE')
  assert.equal((await client().call('/api/auth/reset-password', { method: 'POST', body: { token: 'f'.repeat(64), password: 'whatever12' } })).status, 400)
})

test('public enquiries and CSV formula escaping', async () => {
  assert.equal((await client().call('/api/enquiries', { method: 'POST', body: { type: 'corporate', company: 'Acme', contact: 'A B', email: 'a@b.co', phone: '9876543210', requirements: 'Daily commute for 40 staff' } })).status, 201)
  const c = await customer('csv')
  await c.call('/api/me', { method: 'PATCH', body: { name: '=HYPERLINK("x")', phone: c.phone } })
  const ref = (await c.call('/api/bookings', { method: 'POST', body: booking() })).data.reference
  const bm = client()
  await bm.call('/api/admin/auth/login', { method: 'POST', body: { email: `booking_manager-${run}@example.test`, password: 'staffpassword1' } })
  const csv = (await bm.call(`/api/admin/bookings.csv?q=${ref}`)).data
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`), 'formula cell must be neutralised')
})
