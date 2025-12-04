/* eslint-env node */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Muat variabel dari .env (jika ada)
dotenv.config()

// Helper: ambil env var dan hapus tanda kutip di awal/akhir bila ada
function getEnv(name) {
  const v = globalThis.process?.env?.[name]
  if (!v && name.startsWith('VITE_')) {
    // sometimes people set without VITE_ prefix for local dev
    const alt = name.replace(/^VITE_/, '')
    return getEnv(alt)
  }
  if (typeof v === 'string') return v.replace(/^"|"$/g, '')
  return v
}

const SUPABASE_URL = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL')
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_KEY')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\nERROR: Supabase URL atau key tidak ditemukan di environment.')
  console.error('  - Pastikan file `.env` ada di root, atau environment variables sudah di-set.')
  console.error('  - Contoh .env:\n    SUPABASE_URL=https://...\n    SUPABASE_ANON_KEY=sb_publishable_...')
  console.error('\nDebug: (menampilkan variabel yang terdeteksi tanpa mencetak secret)')
  console.error('  cwd:', globalThis.process?.cwd?.())
  const list = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_KEY']
  list.forEach(k => {
    const val = globalThis.process?.env?.[k]
    if (val) {
      console.error(`  ${k}: SET (len=${String(val).length})`)
    } else {
      console.error(`  ${k}: not set`)
    }
  })
  // Do not exit abruptly; create a dummy client that throws helpful errors when used.
}

let supabase
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
} else {
  supabase = {
    from() {
      throw new Error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in environment.')
    }
  }
}

// (optional) function to fetch countries if you have that table
// async function getCountries() { ... }

async function getProfiles() {
  try {
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) {
      console.error('Error fetching profiles:', error)
      return
    }
    console.log('Profiles:', data)
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

// Jalankan contoh: ganti sesuai tabel Anda
;(async () => {
  console.log('Using Supabase URL:', SUPABASE_URL)
  await getProfiles() // coba ambil dari tabel `profiles`
  // await getCountries()
})()
