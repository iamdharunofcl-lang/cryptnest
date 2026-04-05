'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) setError('Invalid email or password. Please try again.')
      else router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch {
      setError('Google sign-in failed.')
      setGoogleLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: '#1e2435', border: '1px solid #2e3650',
    borderRadius: '8px', padding: '10px 12px 10px 36px', fontSize: '13px',
    color: '#e8ecf4', outline: 'none', fontFamily: 'Syne, sans-serif', transition: '.15s',
  }
  const iconStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: '900px', minHeight: '560px', border: '1px solid #2e3650', borderRadius: '16px', overflow: 'hidden' }}>

        {/* Left Branding Panel */}
        <div style={{ flex: 1, background: '#181c27', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid #2e3650' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
              <div style={{ width: '32px', height: '32px', background: '#f4a829', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M20 16.5A4.5 4.5 0 0015.5 12H14a6 6 0 10-5.91 7h7.41A4.5 4.5 0 0020 16.5z" /></svg>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e8ecf4' }}>Crypt<span style={{ color: '#f4a829' }}>Nest</span></div>
                <div style={{ fontSize: '9px', color: '#555e78' }}>A safe nest for every file.</div>
              </div>
            </div>
            <h1 style={{ fontSize: '30px', fontWeight: 800, color: '#e8ecf4', lineHeight: 1.2, marginBottom: '12px', letterSpacing: '-.5px' }}>Enterprise<br />secure storage<br />for your team.</h1>
            <p style={{ fontSize: '13px', color: '#8b93aa', lineHeight: 1.6, marginBottom: '32px' }}>One platform for file management,<br />access control, and compliance.</p>
            {[
              { label: 'AES-256 encryption', sub: 'Zero-knowledge at rest & in transit', bg: '#1a2e1a', stroke: '#22c97e' },
              { label: 'Role-based access control', sub: '5 permission levels per user', bg: '#1e2e42', stroke: '#3c82f6' },
              { label: 'Full audit trail', sub: 'Every action logged & exportable', bg: '#2e2008', stroke: '#f4a829' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={f.stroke} strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8ecf4' }}>{f.label}</div>
                  <div style={{ fontSize: '11px', color: '#555e78' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#555e78' }}>© 2026 CryptNest · SOC2 · ISO 27001 · GDPR</div>
        </div>

        {/* Right Form Panel */}
        <div style={{ width: '380px', flexShrink: 0, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#0f1117' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '20px', padding: '4px 12px 4px 6px', marginBottom: '20px', alignSelf: 'flex-start' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f4a829', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#000' }}>A</div>
            <span style={{ fontSize: '11px', color: '#8b93aa' }}>Acme Corp · Enterprise</span>
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#e8ecf4', marginBottom: '6px' }}>Welcome back</h2>
          <p style={{ fontSize: '12px', color: '#8b93aa', marginBottom: '24px' }}>Sign in to your organization workspace</p>

          {/* ✅ Google SSO Button */}
          <button onClick={handleGoogle} disabled={googleLoading} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '8px', cursor: googleLoading ? 'not-allowed' : 'pointer', marginBottom: '10px', transition: '.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#f4a829'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2e3650'}>
            <div style={{ width: '22px', height: '22px', background: '#1a2436', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e8ecf4', flex: 1, textAlign: 'left' }}>{googleLoading ? 'Redirecting…' : 'Continue with Google'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#2e3650' }} />
            <span style={{ fontSize: '11px', color: '#555e78', whiteSpace: 'nowrap' }}>or sign in with email</span>
            <div style={{ flex: 1, height: '1px', background: '#2e3650' }} />
          </div>

          {error && (
            <div style={{ background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f87171', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '6px', fontWeight: 500, letterSpacing: '.4px' }}>Work email</label>
              <div style={{ position: 'relative' }}>
                <svg style={iconStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555e78" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@acmecorp.com" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#f4a829'} onBlur={e => e.target.style.borderColor = '#2e3650'} />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '6px', fontWeight: 500, letterSpacing: '.4px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <svg style={iconStyle} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555e78" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#f4a829'} onBlur={e => e.target.style.borderColor = '#2e3650'} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#f4a829' }} />
                <span style={{ fontSize: '12px', color: '#8b93aa' }}>Keep me signed in</span>
              </label>
              <Link href="/forgot-password" style={{ fontSize: '12px', color: '#f4a829', textDecoration: 'none' }}>Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: loading ? '#7a5214' : '#f4a829', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, color: '#000', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: '.15s' }}>
              {loading ? 'Signing in…' : 'Sign in to CryptNest'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#555e78' }}>
            New to CryptNest? <Link href="/request-access" style={{ color: '#f4a829', textDecoration: 'none' }}>Request access</Link>
          </p>

          <div style={{ marginTop: '16px', padding: '12px', background: '#181c27', border: '1px solid #2e3650', borderRadius: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#555e78' }}>Need a one-time code? </span>
            <Link href={`/verify-otp?email=${encodeURIComponent(email || '')}`} style={{ fontSize: '11px', color: '#f4a829', textDecoration: 'none' }}>Sign in with OTP →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
