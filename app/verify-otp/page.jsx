'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function VerifyOTPPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(60)
  const inputs = useRef([])

  useEffect(() => {
    if (!email) router.push('/login')
  }, [email])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  function handleInput(val, idx) {
    const newOtp = [...otp]
    newOtp[idx] = val.slice(-1)
    setOtp(newOtp)
    if (val && idx < 5) inputs.current[idx + 1]?.focus()
  }

  function handleKeyDown(e, idx) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  async function handleVerify(e) {
    e.preventDefault()
    const code = otp.join('')
    if (code.length !== 6) { setError('Enter all 6 digits'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, otp: code }),
      })
      const d = await r.json()
      if (d.valid) router.push('/dashboard')
      else setError(d.error || 'Invalid code')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleResend() {
    setResending(true)
    await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email }),
    })
    setCountdown(60); setResending(false); setOtp(['', '', '', '', '', ''])
    inputs.current[0]?.focus()
  }

  const boxStyle = { width: '46px', height: '54px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '9px', fontSize: '22px', fontWeight: 700, color: '#e8ecf4', textAlign: 'center', outline: 'none', fontFamily: 'Syne, sans-serif', transition: '.15s' }

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
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '52px', height: '52px', background: '#2e2008', border: '1px solid #f4a829', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f4a829" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e8ecf4', marginBottom: '6px' }}>Two-factor verification</h2>
            <p style={{ fontSize: '12px', color: '#8b93aa', lineHeight: 1.6 }}>Enter the 6-digit code sent to<br /><strong style={{ color: '#e8ecf4' }}>{email}</strong></p>
          </div>

          {error && <div style={{ background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f87171', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleVerify}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
              {otp.map((digit, i) => (
                <input key={i} ref={el => inputs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleInput(e.target.value, i)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  style={{ ...boxStyle, borderColor: digit ? '#f4a829' : '#2e3650' }}
                  onFocus={e => e.target.style.borderColor = '#f4a829'}
                  onBlur={e => e.target.style.borderColor = digit ? '#f4a829' : '#2e3650'}
                />
              ))}
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: loading ? '#7a5214' : '#f4a829', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, color: '#000', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: '14px' }}>
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: '12px', color: '#555e78' }}>
            {countdown > 0 ? (
              <span>Resend code in {countdown}s</span>
            ) : (
              <button onClick={handleResend} disabled={resending} style={{ background: 'none', border: 'none', color: '#f4a829', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <a href="/login" style={{ fontSize: '12px', color: '#555e78', textDecoration: 'none' }}>← Back to login</a>
          </div>
        </div>
      </div>
    </div>
  )
}
