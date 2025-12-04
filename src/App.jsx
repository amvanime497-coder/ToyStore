import { useState, useRef, useEffect } from 'react'
import './index.css'

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

      // Use server-side signup endpoint which will insert into the
      // `profiles` table (and create auth user if server has service role).
      const API = import.meta.env.VITE_API_URL || ''
      try {
        const resp = await fetch(`${API}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: rawEmail, username: rawUsername, role, password: rawPassword })
        })
        const payload = await resp.json()
        if (!resp.ok) throw new Error(payload?.error || JSON.stringify(payload))
        setSuccess('Akun berhasil dibuat. Silakan masuk.')
        setMode('login')
        setUsername(rawEmail || rawUsername)
        setPassword('')
        return
      } catch (srvErr) {
        console.error('Server-side signup failed:', srvErr)
        setError(srvErr.message || String(srvErr))
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
      // Use backend /login which checks `profiles` table for username/email + password
      const API = import.meta.env.VITE_API_URL || ''
      const usernameOrEmail = username || email
      try {
        const resp = await fetch(`${API}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail, password })
        })
        const payload = await resp.json()
        if (!resp.ok) throw new Error(payload?.error || JSON.stringify(payload))
        const user = payload.user
        if (!user) throw new Error('Login gagal: respons server tidak berisi user')
        onLogin(user)
        return
      } catch (loginErr) {
        console.error('server login failed', loginErr)
        setError(loginErr.message || String(loginErr))
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
