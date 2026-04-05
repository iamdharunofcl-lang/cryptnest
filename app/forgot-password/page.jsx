'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (d.error) setError(d.error)
      else setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '8px', padding: '10px 12px 10px 36px', fontSize: '13px', color: '#e8ecf4', outline: 'none', fontFamily: 'inherit' }

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
          {!sent ? (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e8ecf4', marginBottom: '8px' }}>Reset your password</h2>
              <p style={{ fontSize: '12px', color: '#8b93aa', marginBottom: '24px', lineHeight: 1.6 }}>Enter your work email and we'll send you a secure reset link.</p>

              {error && (
                <div style={{ background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f87171', marginBottom: '16px' }}>{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '6px', fontWeight: 500 }}>Work email</label>
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555e78" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@acmecorp.com" required style={inputStyle} onFocus={e => e.target.style.borderColor = '#f4a829'} onBlur={e => e.target.style.borderColor = '#2e3650'} />
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: loading ? '#7a5214' : '#f4a829', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, color: '#000', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', background: '#0e2a1a', border: '1px solid #22c97e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c97e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#e8ecf4', marginBottom: '8px' }}>Check your inbox!</h3>
              <p style={{ fontSize: '12px', color: '#8b93aa', lineHeight: 1.6, marginBottom: '16px' }}>We sent a reset link to <strong style={{ color: '#e8ecf4' }}>{email}</strong>. Click the link to create a new password.</p>
              <p style={{ fontSize: '11px', color: '#555e78' }}>Link expires in 1 hour. Check your spam folder if you don't see it.</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link href="/login" style={{ fontSize: '12px', color: '#f4a829', textDecoration: 'none' }}>← Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
