import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'
import { saveAuthSession } from '../utils/auth'
import { GoogleLogin } from '@react-oauth/google'


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LOGIN_URL = `${API_BASE_URL}/api/auth/login/`
//Google OAuth login URL (for backend)
const GOOGLE_LOGIN_URL = `${API_BASE_URL}/api/auth/google/`

const getLoginErrorMessage = (error) => {
  const data = error.response?.data
  const fields = ['detail', 'error', 'message', 'non_field_errors', 'email', 'password']

  if (typeof data === 'string') return data

  for (const field of fields) {
    const value = data?.[field]
    const message = Array.isArray(value) ? value[0] : value

    if (message) return message
  }

  if (error.request) return 'Unable to reach the login server.'

  return 'Login failed. Please try again.'
}

export default function LoginPage() {
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => Boolean(localStorage.getItem('rememberedEmail')))
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post(
        LOGIN_URL,
        { email: trimmedEmail, password },
        { headers: { 'Content-Type': 'application/json' } },
      )

      const { access, refresh, user } = response.data || {}

      if (!access || !refresh || !user) {
        throw new Error('Login response missing auth details')
      }

      saveAuthSession({ access, refresh, user })

      if (remember) {
        localStorage.setItem('rememberedEmail', trimmedEmail)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      toast.success('Login successful!')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Login failed:', error)
      toast.error(getLoginErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  //google OAuth login handler
  const handleGoogleLogin = async (credentialResponse) => {
  const credential = credentialResponse?.credential

  if (!credential) {
    toast.error('Google login did not return a credential.')
    return
  }

  setLoading(true)

  try {
    const response = await axios.post(
      GOOGLE_LOGIN_URL,
      { credential },
      { headers: { 'Content-Type': 'application/json' } },
    )

    const { access, refresh, user } = response.data || {}

    if (!access || !refresh || !user) {
      throw new Error('Google login response missing auth details')
    }

    saveAuthSession({ access, refresh, user })

    toast.success('Google login successful!')
    navigate('/dashboard', { replace: true })
  } catch (error) {
    console.error('Google login failed:', error)
    toast.error(getLoginErrorMessage(error))
  } finally {
    setLoading(false)
  }
}

const handleGoogleLoginError = () => {
  toast.error('Google login failed. Please try again.')
}

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-content">
          <div className="brand-logo">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h2>AMC Pro</h2>
          <p>Enterprise-grade project management for annual maintenance contracts. Monitor, manage, and maintain with ease.</p>

          <div className="login-features">
            <div className="feature-item">
              <div className="feature-icon"><i className="fa-solid fa-chart-line"></i></div>
              <span>Real-time project monitoring</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><i className="fa-solid fa-bell"></i></div>
              <span>Equipment expiry alerts</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><i className="fa-solid fa-route"></i></div>
              <span>Comprehensive audit trails</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><i className="fa-solid fa-layer-group"></i></div>
              <span>Multi-site management</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-form-card fade-in">
          <h3>Welcome back</h3>
          <p className="subtitle">Enter your credentials to access the dashboard</p>

          <form onSubmit={handleLogin}>
            <div className="form-group-custom">
              <label>Email Address</label>
              <div className="input-wrapper">
                <i className="fa-regular fa-envelope"></i>
                <input
                  type="email"
                  placeholder="admin@amcpro.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group-custom">
              <label>Password</label>
              <div className="input-wrapper">
                <i className="fa-solid fa-lock"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={loading} />
                <label className="form-check-label" htmlFor="remember" style={{ fontSize: 13 }}>Remember me</label>
              </div>
              <a href="#" className="text-decoration-none" style={{ fontSize: 13, color: 'var(--primary)' }}>Forgot password?</a>
            </div>   

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</> : <>Sign In <i className="fa-solid fa-arrow-right ms-2"></i></>}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={handleGoogleLoginError}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              width="100%"
            />
          </div>

          <p className="text-center mt-4" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            © 2026 AMC Pro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
 
