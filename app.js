import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Muat variabel dari .env
dotenv.config()

// Ambil variabel dari env. Sesuaikan nama jika Anda pakai nama lain.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Supabase URL atau key tidak ditemukan di environment. Pastikan Anda punya file .env dengan SUPABASE_URL dan SUPABASE_ANON_KEY (atau SUPABASE_KEY).')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function getCountries() {
  try {
    const { data, error } = await supabase.from('countries').select('*')
    if (error) {
      console.error('Error fetching countries:', error)
      return
    }
    console.log('Countries:', data)
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

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
