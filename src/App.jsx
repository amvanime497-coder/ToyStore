import { useState, useRef, useEffect } from 'react'
import './index.css'
import { supabase } from './supabaseClient'

function AuthBox({ onLogin }) {
  const [mode, setMode] = useState('login') // or 'signup'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('customer')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordRef = useRef(null)

  async function handleSignup(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      setLoading(true)
      // Trim inputs and validate email locally to catch obvious issues
      const rawEmail = String(email || '').trim()
      const rawUsername = String(username || '').trim()
      const rawPassword = String(password || '')

      // Basic email regex (simple, good enough for client-side validation)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!rawEmail || !emailRegex.test(rawEmail)) {
        setError(`Email address "${rawEmail}" is invalid`)
        setLoading(false)
        return
      }

      if (!rawPassword || rawPassword.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Use Supabase client for signup. This uses the anon key and the
      // public Supabase API to create an auth user. After signup we sign
      // in and then create a profile row in the `profiles` table.
      try {
        // Create auth user
        const { data: signData, error: signErr } = await supabase.auth.signUp({
          email: rawEmail,
          password: rawPassword,
          options: { data: { username: rawUsername, role } }
        })
        if (signErr) throw signErr

        // Some Supabase configs don't auto-sign-in after signUp. Try sign-in now.
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: rawEmail,
          password: rawPassword
        })
        if (signInErr) {
          // Not fatal — user may need to confirm email. Show success message.
          setSuccess('Akun dibuat. Silakan konfirmasi email jika diperlukan, lalu masuk.')
          setMode('login')
          setUsername(rawEmail || rawUsername)
          setPassword('')
          return
        }

        const sessionUser = signInData?.user || signData?.user
        const authId = sessionUser?.id

        // Insert profile row. This will succeed if your RLS policies allow
        // authenticated users to insert their own profile (auth.uid() = auth_id).
        try {
          const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .insert([{ auth_id: authId, username: rawUsername, email: rawEmail, role, password: rawPassword }])
            .select()
            .single()
          if (profErr) console.warn('profile insert warning', profErr)
          else console.log('profile created', prof)
        } catch (profEx) {
          console.warn('profile insert exception', profEx)
        }

        setSuccess('Akun berhasil dibuat dan masuk.')
        setMode('login')
        setUsername(rawEmail || rawUsername)
        setPassword('')
        return
      } catch (srvErr) {
        console.error('Supabase signup failed:', srvErr)
        setError(srvErr?.message || String(srvErr))
      }
    } catch (err) {
      console.error('signup error', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      // Use Supabase auth to sign in
      const usernameOrEmail = username || email
      try {
        // If the user entered a username instead of email, resolve email via profiles table
        let loginEmail = usernameOrEmail
        if (username && !email) {
          try {
            const { data: p, error: pErr } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', usernameOrEmail)
              .limit(1)
              .maybeSingle()
            if (pErr) console.warn('profile lookup warn', pErr)
            if (p?.email) loginEmail = p.email
          } catch (lookupEx) {
            console.warn('profile lookup ex', lookupEx)
          }
        }

        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password
        })
        if (signInErr) throw signInErr

        const user = signInData?.user
        if (!user) throw new Error('Login gagal: respons auth tidak berisi user')

        // Fetch profile row for the authenticated user
        try {
          const { data: profile, error: profErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_id', user.id)
            .limit(1)
            .maybeSingle()
          if (profErr) console.warn('profile fetch warning', profErr)
          const publicUser = profile || { id: user.id, email: user.email }
          onLogin(publicUser)
          return
        } catch (pfEx) {
          console.warn('profile fetch ex', pfEx)
          onLogin({ id: user.id, email: user.email })
          return
        }
      } catch (loginErr) {
        console.error('supabase login failed', loginErr)
        setError(loginErr?.message || String(loginErr))
      }
    } catch (err) {
      console.error('login error', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'login' && passwordRef.current) passwordRef.current.focus()
  }, [mode])

  return (
    <div className="auth-box">
      <h2 className="brand">Toy Store</h2>
      <p className="brand-desc">Mainan unik untuk semua usia — dirancang untuk merangsang kreativitas, menumbuhkan rasa ingin tahu, dan menghadirkan kebahagiaan belajar lewat bermain, sambil menjaga standar keamanan dan kualitas tertinggi.</p>

      <div className="auth-card">
        <div className="mode-toggle">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Masuk</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Buat Akun</button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="auth-form">
          <label>Username atau Email
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username atau email" />
          </label>

          {mode === 'signup' && (
            <label>Email
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
            </label>
          )}

          <label>Kata Sandi
            <div className="pw-row">
              <input ref={passwordRef} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="kata sandi" />
              <button type="button" className="show-btn" onClick={() => setShowPassword(s => !s)}>{showPassword ? 'Sembunyikan' : 'Tampilkan'}</button>
            </div>
          </label>

          {mode === 'signup' && (
            <label>Peran
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="customer">Customer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          )}

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button className="primary" type="submit" disabled={loading}>{mode === 'login' ? 'Masuk' : 'Buat Akun'}</button>
        </form>
      </div>

      <div className="info-card">
        <h3>Tentang Toy Store</h3>
        <p>Koleksi mainan edukatif dan koleksi lucu yang dirancang untuk menstimulasi kreativitas dan imajinasi anak-anak. Tema minimal: hitam, hijau, putih.</p>
      </div>
    </div>
  )
}

function Dashboard({ user, onLogout }) {
  return (
    <div className="dashboard">
      <div className="dashboard-inner">
        <h2>Selamat datang, {user?.username || user?.email}</h2>
        <p>Halaman kosong — Anda sudah berhasil masuk.</p>
        <button onClick={onLogout}>Keluar</button>
      </div>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)

  function handleLogin(userObj) {
    setUser(userObj)
  }

  function handleLogout() {
    setUser(null)
  }

  return (
    <div className="page-root">
      <div className="left-panel">
        <div className="collage">
          <div className="collage-card">
            <h1 className="collage-title">Toy Store</h1>
            <p className="collage-sub">Pilihan mainan kurasi untuk menumbuhkan kreativitas, motorik, dan imajinasi anak di setiap tahap—aman, inspiratif, dan penuh kegembiraan.</p>
          </div>
        </div>
      </div>
      <div className="right-panel">
        {!user ? <AuthBox onLogin={handleLogin} /> : <Dashboard user={user} onLogout={handleLogout} />}
      </div>
    </div>
  )
}

export default App
