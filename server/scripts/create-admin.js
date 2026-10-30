// Creates (or resets) a staff account from the command line. There is no public admin sign-up.
// Credentials come from the environment, never from code:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-password' ADMIN_NAME='Your Name' [ADMIN_ROLE=SUPER_ADMIN] npm run create-admin
import bcrypt from 'bcryptjs'
import { migrate, pool, query } from '../src/db.js'
import { STAFF_ROLES } from '../src/auth.js'

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Super Admin', ADMIN_ROLE = 'SUPER_ADMIN' } = process.env
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters).')
  process.exit(1)
}
if (!STAFF_ROLES.includes(ADMIN_ROLE)) {
  console.error(`ADMIN_ROLE must be one of: ${STAFF_ROLES.join(', ')}`)
  process.exit(1)
}
await migrate()
const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
await query(
  `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), password_hash = VALUES(password_hash),
     status = 'active', failed_logins = 0, locked_until = NULL`,
  [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), hash, ADMIN_ROLE],
)
console.log(`${ADMIN_ROLE} ready: ${ADMIN_EMAIL.toLowerCase()}`)
await pool.end()
