'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setChecking(false); return }
    fetch('/api/auth/reset-password?token=' + token)
      .then(r => r.json())
      .then(d => { setValid(d.valid); setEmail(d.email || ''); setChecking(false) })
      .catch(() => setChecking(false))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const d = await r.json()
      if (d.error) setError(d.error)
      else { setDone(true); setTimeout(() => router.push('/login'), 3000) }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inputStyle = { width: '100%', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#e8ecf4', outline: 'none', fontFamily: 'inherit', marginBottom: '12px' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: '#f4a829', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M20 16.5A4.5 4.5 0 0015.5 12H14a6 6 0 10-5.91 7h7.41A4.5 4.5 0 0020 16.5z" /></svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#e8ecf4' }}>Crypt<span style={{ color: '#f4a829' }}>Nest</span></span>
          </div>
        </div>

        <div style={{ background: '#181c27', border: '1px solid #2e3650', borderRadius: '12px', padding: '32px' }}>
          {checking && <div style={{ textAlign: 'center', color: '#8b93aa', fontSize: '13px' }}>Verifying reset link…</div>}

          {!checking && !valid && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>❌</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e8ecf4', marginBottom: '8px' }}>Invalid or expired link</h3>
              <p style={{ fontSize: '12px', color: '#8b93aa', marginBottom: '20px' }}>This reset link is invalid or has expired.</p>
              <Link href="/forgot-password" style={{ color: '#f4a829', fontSize: '13px' }}>Request a new reset link →</Link>
            </div>
          )}

          {!checking && valid && !done && (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e8ecf4', marginBottom: '6px' }}>Create new password</h2>
              <p style={{ fontSize: '12px', color: '#8b93aa', marginBottom: '24px' }}>For: <strong style={{ color: '#e8ecf4' }}>{email}</strong></p>

              {error && <div style={{ background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f87171', marginBottom: '16px' }}>{error}</div>}

              <form onSubmit={handleSubmit}>
                <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '6px', fontWeight: 500 }}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required style={inputStyle} onFocus={e => e.target.style.borderColor = '#f4a829'} onBlur={e => e.target.style.borderColor = '#2e3650'} />
                <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Confirm password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required style={{ ...inputStyle, marginBottom: '20px' }} onFocus={e => e.target.style.borderColor = '#f4a829'} onBlur={e => e.target.style.borderColor = '#2e3650'} />
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: loading ? '#7a5214' : '#f4a829', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, color: '#000', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>
            </>
          )}

          {done && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', background: '#0e2a1a', border: '1px solid #22c97e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c97e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e8ecf4', marginBottom: '8px' }}>Password reset!</h3>
              <p style={{ fontSize: '12px', color: '#8b93aa' }}>Redirecting to login…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
