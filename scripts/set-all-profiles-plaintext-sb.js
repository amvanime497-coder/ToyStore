#!/usr/bin/env node
// scripts/set-all-profiles-plaintext-sb.js
// WARNING: This will set EVERY row in public.profiles.password to 'gg123456' via Supabase admin API.
// Do NOT run in production. Intended for local/dev/testing only.

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
    console.log('Updating ALL profiles -> set password = "gg123456"')
    // Update in batches in case table is large.
    const batchSize = 200
    let offset = 0
    while (true) {
      const { data: rows, error: selErr } = await supabase
        .from('profiles')
        .select('id')
        .range(offset, offset + batchSize - 1)

      if (selErr) {
        console.error('Select error', selErr)
        globalThis.process.exit(1)
      }
      if (!rows || rows.length === 0) break

      const ids = rows.map(r => r.id)
      const { data, error } = await supabase
        .from('profiles')
        .update({ password: 'gg123456' })
        .in('id', ids)
        .select('id,email')

      if (error) {
        console.error('Update error', error)
        globalThis.process.exit(1)
      }

      console.log('Updated batch, rows:', data?.length ?? ids.length)
      offset += batchSize
    }

    console.log('All done.')
    } catch (err) {
    console.error('Unexpected error', err)
    globalThis.process.exit(1)
  }
}

run()
