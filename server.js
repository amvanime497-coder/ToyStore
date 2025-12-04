/* eslint-env node */
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
// bcrypt removed: storing plaintext passwords per developer request (dev only)
import { Pool } from 'pg'

dotenv.config()

// If connecting to Supabase session poolers you may encounter TLS certificate issues
// on some platforms. For local development only, we selectively disable TLS
// verification when the DATABASE_URL looks like Supabase's pooler host.
const DATABASE_URL = globalThis.process?.env?.DATABASE_URL
if (DATABASE_URL && DATABASE_URL.includes('pooler.supabase.com')) {
  console.warn('Detected Supabase pooler in DATABASE_URL — disabling TLS verification for local dev')
  // WARNING: this is insecure and must NOT be used in production.
  if (globalThis.process) globalThis.process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const app = express()
app.use(cors())
app.use(express.json())

// Simple request logger for debugging
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url)
  if (req.method !== 'GET') console.log('  body:', req.body)
  next()
})

const SUPABASE_URL = "https://rcphxrqhanmvprgirigs.supabase.co"
// Prefer a server-side service role key for inserts (set SUPABASE_SERVICE_ROLE_KEY in .env)
const SUPABASE_KEY = globalThis.process?.env?.SUPABASE_SERVICE_ROLE_KEY || globalThis.process?.env?.SUPABASE_KEY || ""
const HAS_SERVICE_ROLE = Boolean(globalThis.process?.env?.SUPABASE_SERVICE_ROLE_KEY)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('SUPABASE_URL or SUPABASE_KEY not set in env. server endpoints will fail without proper env.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Optional: connect directly to Postgres via DATABASE_URL (server-side only)
let pgPool = null
const USE_PG = String(globalThis.process?.env?.USE_PG || '').toLowerCase() === 'true'
if (DATABASE_URL && USE_PG) {
  try {
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
    // Attach an error listener so pool/client errors don't crash the process.
    // If the pool reports a fatal error (for example the Supabase pooler closing
    // connections), shut down the pool and fall back to the Supabase client.
    pgPool.on('error', async (err) => {
      try {
        console.error('Unexpected error on idle Postgres client', err)
        console.warn('Shutting down pgPool and falling back to Supabase client')
        await pgPool.end().catch(() => {})
      } catch (e) {
        console.error('Error while ending pgPool', e)
      } finally {
        pgPool = null
      }
    })
    console.log('Postgres pool created')
  } catch (err) {
    console.error('Failed to create Postgres pool:', err)
    pgPool = null
  }
} else if (DATABASE_URL && !USE_PG) {
  console.log('DATABASE_URL present but USE_PG is false — skipping pg pool and using Supabase client only')
}
// Global error handlers to prevent the process from exiting on unhandled errors
if (globalThis.process) {
  globalThis.process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection at:', reason)
  })
  globalThis.process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err)
  })
}

// health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Friendly root so browser visiting http://localhost:3001 shows helpful info
app.get('/', (req, res) => {
  res.send(`Auth server is running. Available endpoints:\n- GET /health\n- GET /dbtest\n- POST /signup\n- POST /login`)
})

// DB test endpoint (verifies direct Postgres connection if configured)
app.get('/dbtest', async (req, res) => {
  if (!pgPool) return res.status(500).json({ ok: false, error: 'DATABASE_URL not configured' })
  try {
    const r = await pgPool.query('SELECT NOW() as now')
    res.json({ ok: true, now: r.rows[0].now })
  } catch (err) {
    console.error('dbtest error', err)
    res.status(500).json({ ok: false, error: String(err) })
  }
})

// Simple signup: insert into table "users" (username, email, password, role)
app.post('/signup', async (req, res) => {
  const { username, email, password, role } = req.body || {}
  if (!username || !email || !password) return res.status(400).json({ error: 'Lengkapi username, email, dan password' })

  // NOTE: storing plaintext password per developer request (development only)

  try {
    // If we have a Supabase service role key, create the auth user server-side
    // and also create a profile row in public.users. This bypasses RLS safely
    // because the service role key is server-side only.
    if (HAS_SERVICE_ROLE) {
      try {
        // Create user via Supabase Admin API (service role)
        const adminCreate = await supabase.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { username, role }
        })
        console.log('admin create response:', adminCreate)
        try {
          const createdUser = adminCreate.data?.user || adminCreate.data
          console.log('created auth user id:', createdUser?.id)
        } catch {
          // ignore
        }
        if (adminCreate?.error) throw adminCreate.error
        const createdUser = adminCreate.data?.user || adminCreate.data

        // Also create a row in public.users using the service role key (bypasses RLS)
        try {
          // Insert a profile row into `profiles` linked by `auth_id` (UUID).
          const { data: profData, error: profErr } = await supabase
            .from('profiles')
            .insert([{ auth_id: createdUser.id, username, email, role, password }])
            .select()
            .single()
          if (profErr) console.warn('profile insert warning', profErr)
          else console.log('profile insert created:', profData)
        } catch (profEx) {
          console.warn('failed to create profile row', profEx)
        }

        return res.json({
          user: { id: createdUser.id, username, email, role },
          debug: { createdUserId: createdUser.id }
        })
      } catch (adminErr) {
        console.error('service-role signup error', adminErr)
        // fallthrough to other methods if service role create failed
      }
    }

    // If a direct Postgres pool is available, prefer it for signups to avoid Supabase RLS issues.
    if (pgPool) {
      try {
        // check existing via Postgres (profiles table)
        const existingQ = await pgPool.query(
          'SELECT id FROM public.profiles WHERE username = $1 OR email = $2 LIMIT 1',
          [username, email]
        )
        if (existingQ.rows.length) return res.status(400).json({ error: 'Pengguna sudah terdaftar' })

        const ins = await pgPool.query(
          'INSERT INTO public.profiles (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
          [username, email, password, role || 'customer']
        )
        const row = ins.rows[0]
        return res.json({ user: row })
      } catch (pgErr) {
        console.error('pgPool error during signup, falling back to Supabase client', pgErr)
        try {
          await pgPool.end().catch((endErr) => console.error('error ending pgPool after pgErr', endErr))
        } catch (endErr) {
          console.error('error ending pgPool after pgErr', endErr)
        }
        pgPool = null
        // continue to Supabase fallback below
      }
    }

    // Fallback to Supabase client (requires permissive RLS if no service role key)
    const { data: existing, error: selErr } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.eq.${username},email.eq.${email}`)

    if (selErr) throw selErr
    if (existing && existing.length) return res.status(400).json({ error: 'Pengguna sudah terdaftar' })

    const { data, error } = await supabase.from('profiles').insert([{ username, email, password, role }]).select().single()
    if (error) throw error

    res.json({ user: { id: data.id, username: data.username, email: data.email, role: data.role } })
  } catch (err) {
    // If Supabase failed due to RLS and pgPool is present, try a pg fallback as a last resort.
    const msg = String(err).toLowerCase()
    if (pgPool && msg.includes('row-level')) {
      try {
        const existingQ = await pgPool.query(
          'SELECT id FROM public.users WHERE username = $1 OR email = $2 LIMIT 1',
          [username, email]
        )
        if (existingQ.rows.length) return res.status(400).json({ error: 'Pengguna sudah terdaftar' })

        const ins = await pgPool.query(
          'INSERT INTO public.users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
          [username, email, password, role || 'customer']
        )
        return res.json({ user: ins.rows[0] })
      } catch (err2) {
        console.error('pg fallback error', err2)
        return res.status(500).json({ error: String(err2) })
      }
    }

    console.error('signup error', err)
    res.status(500).json({ error: err.message || String(err) })
  }
})

// Simple login: check table users
app.post('/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body || {}
  if (!usernameOrEmail || !password) return res.status(400).json({ error: 'Isi username/email dan password' })
  try {
    // Resolve username -> email (support login by username or email)
    const { data: profiles, error: selErr } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.eq.${usernameOrEmail},email.eq.${usernameOrEmail}`)
      .limit(1)

    if (selErr) throw selErr
    if (!profiles || !profiles.length) return res.status(400).json({ error: 'Akun tidak ditemukan. Silakan buat akun terlebih dahulu.' })

    const profile = profiles[0]
    const email = profile.email

    // Try Supabase Auth first
    const authRes = await supabase.auth.signInWithPassword({ email, password })
    const authData = authRes?.data

    if (authData?.user) {
      return res.json({ user: { id: profile.id, username: profile.username, email: profile.email, role: profile.role }, session: authData.session ?? null })
    }

    // If Supabase Auth didn't authenticate (e.g. profile-only user), compare plaintext password.
    // WARNING: plaintext comparison is INSECURE and for development/testing only.
    if (profile.password) {
      try {
        if (password === profile.password) return res.json({ user: { id: profile.id, username: profile.username, email: profile.email, role: profile.role } })
      } catch (e) {
        console.error('Password compare error', e)
      }
    }

    return res.status(401).json({ error: 'Username atau password salah' })
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) })
  }
})

// Admin helper: create or confirm an auth user and ensure a public.users profile exists.
// Requires SUPABASE_SERVICE_ROLE_KEY to be set in server env.
app.post('/admin/confirm-or-create', async (req, res) => {
  if (!HAS_SERVICE_ROLE) return res.status(403).json({ error: 'Service role key not configured on server' })
  const { email, username, role, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' })

  try {
    const adminCreate = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role }
    })
    console.log('admin create response:', adminCreate)
    if (adminCreate?.error && !adminCreate?.data) throw adminCreate.error
    const createdUser = adminCreate.data?.user || adminCreate.data

    // ensure profile row exists in public.users (service role bypasses RLS)
    // Insert by `auth_id` (UUID) to avoid conflicting with integer PKs.
    try {
      const { data: profData, error: profErr } = await supabase
        .from('users')
        .insert([{ auth_id: createdUser.id, username: username || email, email, role: role || 'customer' }])
        .select()
      if (profErr) console.warn('profile insert warning', profErr)
      else console.log('profile insert created (admin):', profData)
      return res.json({
        ok: true,
        user: { id: createdUser.id, email, username: username || email, role: role || 'customer' },
        debug: { createdUserId: createdUser.id, profileInsert: profData || null, profileInsertError: profErr || null }
      })
    } catch (profEx) {
      console.warn('failed to create profile row', profEx)
      return res.json({
        ok: true,
        user: { id: createdUser.id, email, username: username || email, role: role || 'customer' },
        debug: { createdUserId: createdUser.id, profileInsertError: String(profEx) }
      })
    }
  } catch (err) {
    console.error('admin helper error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
})

// Helpful GET handler for browsers: instruct callers to use POST with JSON.
app.get('/admin/confirm-or-create', (req, res) => {
  res.status(200).json({
    ok: false,
    message: 'This endpoint accepts POST requests with JSON. Send a POST to /admin/confirm-or-create with { email, username, password, role } in the JSON body.'
  })
})

// Debug endpoint: list all rows in `profiles` (server-side only)
// Use this for local testing to verify the server can read the table.
app.get('/debug/profiles', async (req, res) => {
  if (!HAS_SERVICE_ROLE) return res.status(403).json({ error: 'Service role key not configured on server' })
  try {
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) return res.status(500).json({ error: String(error) })
    res.json({ data })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})


// Read port from Node environment in a way editors/LSPs tolerate better
const port = globalThis.process?.env?.PORT ?? 3001
app.listen(port, () => {
  console.log(`Auth server listening on http://localhost:${port}`)
})