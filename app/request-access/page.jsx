'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function RequestAccessPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', role: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (d.error) setError(d.error)
      else setSent(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', background: '#1e2435', border: '1px solid #2e3650',
    borderRadius: '8px', padding: '9px 12px', fontSize: '13px',
    color: '#e8ecf4', outline: 'none', fontFamily: 'Syne, sans-serif',
    transition: '.15s', marginBottom: '14px',
  }
  const onFocus = e => e.target.style.borderColor = '#f4a829'
  const onBlur = e => e.target.style.borderColor = '#2e3650'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#e8ecf4', marginBottom: '6px' }}>Request access</h2>
              <p style={{ fontSize: '12px', color: '#8b93aa', marginBottom: '24px', lineHeight: 1.6 }}>Fill in the form below and the admin team will review your request. You'll be notified by email once approved.</p>

              {error && (
                <div style={{ background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#f87171', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Name + Email row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px', fontWeight: 500 }}>Full name *</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Smith" required style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px', fontWeight: 500 }}>Work email *</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@company.com" required style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                </div>

                {/* Company + Role row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px', fontWeight: 500 }}>Company</label>
                    <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Acme Corp" style={{ ...inputStyle }} onFocus={onFocus} onBlur={onBlur} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px', fontWeight: 500 }}>Your role</label>
                    <select value={form.role} onChange={e => set('role', e.target.value)} style={{ ...inputStyle, color: form.role ? '#e8ecf4' : '#555e78' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="">Select role…</option>
                      {['Engineer', 'Manager', 'Director', 'Finance', 'HR', 'Legal', 'Marketing', 'Executive', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* Message */}
                <label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px', fontWeight: 500 }}>Why do you need access? (optional)</label>
                <textarea value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us briefly why you need access to CryptNest…" rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} onFocus={onFocus} onBlur={onBlur} />

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px', background: loading ? '#7a5214' : '#f4a829', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, color: '#000', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: '.15s' }}>
                  {loading ? 'Sending request…' : 'Send access request'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: '60px', height: '60px', background: '#0e2a1a', border: '1px solid #22c97e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c97e" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e8ecf4', marginBottom: '8px' }}>Request sent!</h3>
              <p style={{ fontSize: '13px', color: '#8b93aa', lineHeight: 1.6, marginBottom: '8px' }}>Your request has been sent to the admin team. We've also sent a confirmation to <strong style={{ color: '#e8ecf4' }}>{form.email}</strong>.</p>
              <p style={{ fontSize: '12px', color: '#555e78' }}>Typical response time: 1–2 business days.</p>
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
