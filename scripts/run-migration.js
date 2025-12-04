#!/usr/bin/env node
// scripts/run-migration.js
// Simple runner to execute a SQL migration file using DATABASE_URL env var.

import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config()

const MIGRATION_FILE = globalThis.process.argv[2] || path.join(globalThis.process.cwd(), 'supabase-migrations', '001_create_profiles.sql')
const DATABASE_URL = globalThis.process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please set it in your environment or .env file.')
  globalThis.process.exit(2)
}

async function run() {
  const sql = fs.readFileSync(MIGRATION_FILE, { encoding: 'utf8' })
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  try {
    console.log('Connecting to DB...')
    const client = await pool.connect()
    try {
      console.log('Running migration file:', MIGRATION_FILE)
      // Execute the full SQL file as a single batch. This preserves dollar-quoted
      // blocks (DO $$ ... $$) and other multi-statement constructs.
      try {
        await client.query(sql)
        console.log('Migration completed.')
      } catch (st) {
        console.warn('Migration failed:', st.message || st)
      }
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await pool.end().catch(() => {})
  }
}

run().catch(err => {
  console.error('Unexpected error', err)
  globalThis.process.exit(1)
})
