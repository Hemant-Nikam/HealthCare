import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../hooks/useAuth'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '259455226051-27ghtm52pfcms0frh710c9pipa7ikkvq.apps.googleusercontent.com'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const googleBtnRef = useRef(null)
  const googleLoginRef = useRef(googleLogin)
  const navigateRef = useRef(navigate)

  // Keep refs up to date
  googleLoginRef.current = googleLogin
  navigateRef.current = navigate

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google?.accounts?.id) {
        setTimeout(initGoogle, 300)
        return
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            const user = await googleLoginRef.current(response.credential)
            toast.success(`Welcome back, ${user.name}!`)
            if (user.role === 'ADMIN') navigateRef.current('/admin')
            else if (user.role === 'DOCTOR') navigateRef.current('/doctor')
            else navigateRef.current('/patient')
          } catch (err) {
            toast.error(err.response?.data || 'Google sign-in failed')
          }
        },
      })
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'signin_with',
          shape: 'pill',
        })
      }
    }
    initGoogle()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.name}!`)
      if (user.role === 'ADMIN') navigate('/admin')
      else if (user.role === 'DOCTOR') navigate('/doctor')
      else navigate('/patient')
    } catch (err) {
      toast.error(err.response?.data || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Health<span>Care</span></h1>
          <p>Smart Healthcare Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <div ref={googleBtnRef} className="google-btn-container" id="google-signin-btn"></div>

        <p className="text-center text-sm text-muted mt-4">
          Don't have an account? <Link to="/register" style={{ color: 'var(--primary)' }}>Sign Up</Link>
        </p>
        <p className="text-center text-sm mt-4">
          <Link to="/emergency" style={{ color: 'var(--danger)', fontWeight: 600 }}>🚨 Emergency Access</Link>
        </p>

      </div>
    </div>
  )
}
