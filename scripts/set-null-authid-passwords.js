#!/usr/bin/env node
// scripts/set-null-authid-passwords.js
// DANGER: For dev/testing only. Sets password = 'gg123456' for rows where auth_id IS NULL.

import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

const DATABASE_URL = globalThis.process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in environment or .env')
  globalThis.process.exit(2)
}

async function run() {
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    console.log('Connected. About to update profiles WHERE auth_id IS NULL -> set password = "gg123456"')
    const res = await client.query("UPDATE public.profiles SET password = 'gg123456' WHERE auth_id IS NULL RETURNING id, email, username, password")
    console.log('Updated rows count:', res.rowCount)
    if (res.rows && res.rows.length) console.log('Sample updated rows:', res.rows.slice(0,10))
  } catch (err) {
    console.error('Update failed:', err)
  } finally {
    client.release()
    await pool.end().catch(() => {})
  }
}

run().catch(err => {
  console.error('Unexpected error', err)
  globalThis.process.exit(1)
})
