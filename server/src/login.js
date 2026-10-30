// Shared password check with per-account lockout. Used by both customer and admin login.
import bcrypt from 'bcryptjs'
import { query } from './db.js'

const MAX_FAILS = 5
const LOCK_MINUTES = 15
// Compared against when the account doesn't exist, so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12)

export const GENERIC_FAIL = 'Email or password is incorrect.'

/** Returns { user } on success or { error, status } on failure. `where` picks the account (email or phone). */
export async function checkPassword(where, params, password) {
  const [u] = await query(`SELECT *, (locked_until IS NOT NULL AND locked_until > UTC_TIMESTAMP()) AS locked FROM users WHERE ${where} LIMIT 1`, params)
  if (!u) {
    await bcrypt.compare(password, DUMMY_HASH)
    return { error: GENERIC_FAIL, status: 401 }
  }
  if (u.locked) {
    return { error: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.`, status: 429 }
  }
  const ok = await bcrypt.compare(password, u.password_hash)
  if (!ok) {
    const fails = u.failed_logins + 1
    if (fails >= MAX_FAILS) {
      await query('UPDATE users SET failed_logins = 0, locked_until = UTC_TIMESTAMP() + INTERVAL ? MINUTE WHERE id = ?', [LOCK_MINUTES, u.id])
    } else {
      await query('UPDATE users SET failed_logins = ? WHERE id = ?', [fails, u.id])
    }
    return { error: GENERIC_FAIL, status: 401, user: u }
  }
  if (u.status !== 'active') return { error: GENERIC_FAIL, status: 401 }
  if (u.failed_logins || u.locked_until) await query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [u.id])
  return { user: u }
}
