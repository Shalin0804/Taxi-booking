import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'

// DATABASE_URL: mysql://user:pass@host:port/dbname
// DB_SSL=true is required for TiDB Cloud (it rejects plain connections).
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')

export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  connectionLimit: 10,
  dateStrings: true,
  decimalNumbers: true,
})

export const query = async (sql, params = []) => (await pool.query(sql, params))[0]

export async function migrate() {
  const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
  // Strip comment lines before splitting, so a ';' inside a comment can't break a statement.
  for (const stmt of sql.replace(/^\s*--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean)) {
    await pool.query(stmt)
  }
}
