#!/usr/bin/env node
// scripts/set-null-authid-passwords-sb.js
// Uses Supabase HTTP Admin API (service role key) to set plaintext password
// for profiles where auth_id IS NULL. Safer than connecting directly to Postgres
// when using Supabase pooler / TLS restrictions.

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const SUPABASE_URL = globalThis.process.env.SUPABASE_URL
const SUPABASE_KEY = globalThis.process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  globalThis.process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  try {
    console.log('Updating profiles WHERE auth_id IS NULL -> set password = "gg123456"')
    const { data, error, status } = await supabase
      .from('profiles')
      .update({ password: 'gg123456' })
      .is('auth_id', null)
      .select('id,email,username,password')

    if (error) {
      console.error('Supabase update error:', error)
      globalThis.process.exit(1)
    }

    console.log('Update completed. Rows returned (sample):', (data && data.length) ? data.length : 0)
    if (data && data.length) console.log(data.slice(0, 10))
    console.log('Status:', status)
  } catch (err) {
    console.error('Unexpected error', err)
    globalThis.process.exit(1)
  }
}

run()
