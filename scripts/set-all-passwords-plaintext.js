#!/usr/bin/env node
// scripts/set-all-passwords-plaintext.js
// Danger: sets every row in public.profiles.password to the plaintext 'gg123456'

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
    console.log('Connected. About to update all profiles.password to plaintext "gg123456"')
    const res = await client.query("UPDATE public.profiles SET password = 'gg123456' RETURNING id, email, username")
    console.log('Updated rows:', res.rowCount)
    if (res.rows && res.rows.length) console.log('Sample updated rows:', res.rows.slice(0,5))
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
