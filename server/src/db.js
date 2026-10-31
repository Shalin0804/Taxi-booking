import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'

// DATABASE_URL: mysql://user:pass@host:port/dbname
// DB_SSL=true is required for TiDB Cloud (it rejects plain connections).
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
const dbName = new URL(process.env.DATABASE_URL).pathname.slice(1)
if (!dbName || ['sys', 'mysql', 'information_schema', 'performance_schema'].includes(dbName.toLowerCase())) {
  throw new Error(`DATABASE_URL must end with your app database (e.g. /tttcabs), not "/${dbName}". Create it with: CREATE DATABASE tttcabs;`)
}

export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  connectionLimit: 10,
  dateStrings: true,
  decimalNumbers: true,
})

// Timestamps are stored and compared in UTC; India-time conversions happen explicitly in SQL.
pool.pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"))

export const query = async (sql, params = []) => (await pool.query(sql, params))[0]

export async function migrate() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  // Strip comment lines before splitting, so a ';' inside a comment can't break a statement.
  for (const stmt of sql.replace(/^\s*--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean)) {
    await pool.query(stmt)
  }
}
