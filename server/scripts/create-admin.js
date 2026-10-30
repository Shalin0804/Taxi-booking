// Creates (or promotes) the first admin. Credentials come from the environment, never from code:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long-password' ADMIN_NAME='Your Name' npm run create-admin
import bcrypt from 'bcryptjs'
import { migrate, pool, query } from '../src/db.js'

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Administrator' } = process.env
if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters).')
  process.exit(1)
}
await migrate()
const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
await query(
  `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
   ON DUPLICATE KEY UPDATE role = 'admin', password_hash = VALUES(password_hash)`,
  [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), hash],
)
console.log(`Admin ready: ${ADMIN_EMAIL.toLowerCase()}`)
await pool.end()
