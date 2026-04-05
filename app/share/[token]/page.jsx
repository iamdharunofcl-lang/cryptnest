'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

function fmtBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB'
  return (b / 1073741824).toFixed(2) + ' GB'
}

export default function SharePage() {
  const { token } = useParams()
  const [state, setState] = useState('loading')
  const [fileInfo, setFileInfo] = useState(null)
  const [permission, setPermission] = useState('view')
  const [accessCount, setAccessCount] = useState(0)
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { if (token) checkLink() }, [token])

  async function checkLink() {
    try {
      const r = await fetch('/api/share/access?token=' + token)
      if (r.status === 410) { setState('expired'); return }
      if (!r.ok) { const d = await r.json(); setError(d.error || 'Invalid link'); setState('invalid'); return }
      const d = await r.json()
      setFileInfo(d.file)
      setPermission(d.permission)
      setAccessCount(d.accessCount)
      setHasPassword(d.hasPassword)
      setState(d.hasPassword ? 'password' : 'valid')
    } catch (err) {
      setError(err.message); setState('invalid')
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const r = await fetch('/api/share/access?token=' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const d = await r.json()
      if (d.needsPassword) { setError('Incorrect password'); return }
      if (!r.ok) { setError(d.error); return }
      setState('valid')
    } catch (err) { setError(err.message) }
  }

  async function handleDownload() {
    setDownloading(true)
    setError('')
    try {
      const r = await fetch('/api/share/access?token=' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password || undefined }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.error) }
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileInfo?.name || 'download'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { setError(err.message) }
    finally { setDownloading(false) }
  }

  const permColors = { view: '#60a5fa', download: '#4ade80', edit: '#f4a829' }
  const inputStyle = { width: '100%', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#e8ecf4', outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Syne,sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: '#f4a829', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5"><path d="M20 16.5A4.5 4.5 0 0015.5 12H14a6 6 0 10-5.91 7h7.41A4.5 4.5 0 0020 16.5z" /></svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#e8ecf4' }}>Crypt<span style={{ color: '#f4a829' }}>Nest</span></span>
          </div>
        </div>

        {state === 'loading' && <div style={{ background: '#181c27', border: '1px solid #2e3650', borderRadius: '12px', padding: '40px', textAlign: 'center' }}><div style={{ fontSize: '13px', color: '#8b93aa' }}>Verifying link…</div></div>}

        {state === 'expired' && (
          <div style={{ background: '#181c27', border: '1px solid #7a1f1f', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏰</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e8ecf4', marginBottom: '8px' }}>Link expired</h2>
            <p style={{ fontSize: '13px', color: '#8b93aa' }}>This share link has expired. Ask the owner to generate a new one.</p>
          </div>
        )}

        {state === 'invalid' && (
          <div style={{ background: '#181c27', border: '1px solid #7a1f1f', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e8ecf4', marginBottom: '8px' }}>Invalid link</h2>
            <p style={{ fontSize: '13px', color: '#8b93aa' }}>{error || 'This link is invalid or has been revoked.'}</p>
          </div>
        )}

        {/* ✅ Password gate */}
        {state === 'password' && (
          <div style={{ background: '#181c27', border: '1px solid #2e3650', borderRadius: '12px', padding: '28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#e8ecf4', marginBottom: '6px' }}>Password required</h2>
              <p style={{ fontSize: '13px', color: '#8b93aa' }}>This file is password protected. Enter the password to access it.</p>
            </div>
            {error && <div style={{ background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '7px', padding: '10px', fontSize: '12px', color: '#f87171', marginBottom: '14px' }}>{error}</div>}
            <form onSubmit={handlePasswordSubmit}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" style={{ ...inputStyle, marginBottom: '14px' }} required autoFocus onFocus={e => e.target.style.borderColor = '#f4a829'} onBlur={e => e.target.style.borderColor = '#2e3650'} />
              <button type="submit" style={{ width: '100%', padding: '11px', background: '#f4a829', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#000', cursor: 'pointer', fontFamily: 'inherit' }}>Unlock file</button>
            </form>
          </div>
        )}

        {state === 'valid' && fileInfo && (
          <div style={{ background: '#181c27', border: '1px solid #2e3650', borderRadius: '12px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#1e2435', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: '#f4a829', flexShrink: 0 }}>
                {(fileInfo.name?.split('.').pop()?.toUpperCase() || 'FILE').slice(0, 4)}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#e8ecf4', marginBottom: '3px', wordBreak: 'break-word' }}>{fileInfo.name}</div>
                <div style={{ fontSize: '12px', color: '#8b93aa' }}>{fmtBytes(fileInfo.sizeBytes)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#0e2a1a', color: '#22c97e', fontSize: '11px', padding: '4px 10px', borderRadius: '5px', fontWeight: 600 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                AES-256 Encrypted
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#1e2435', color: permColors[permission] || '#60a5fa', fontSize: '11px', padding: '4px 10px', borderRadius: '5px', fontWeight: 600, border: '1px solid #2e3650', textTransform: 'capitalize' }}>
                {permission} access
              </span>
              {hasPassword && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#2e2008', color: '#f4a829', fontSize: '11px', padding: '4px 10px', borderRadius: '5px', fontWeight: 600 }}>🔒 Password protected</span>}
            </div>

            {error && <div style={{ background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '7px', padding: '10px', fontSize: '12px', color: '#f87171', marginBottom: '14px' }}>{error}</div>}

            <div style={{ fontSize: '12px', color: '#555e78', marginBottom: '16px', lineHeight: 1.5 }}>
              {permission === 'view' && 'You have view-only access. The file owner has not enabled downloading for this link.'}
              {permission === 'download' && 'You can download this encrypted file. It will be decrypted automatically on download.'}
              {permission === 'edit' && 'You have edit access. You can download and modify this file.'}
            </div>

            {(permission === 'download' || permission === 'edit') ? (
              <button onClick={handleDownload} disabled={downloading} style={{ width: '100%', padding: '12px', background: downloading ? '#7a5214' : '#f4a829', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: '#000', cursor: downloading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /></svg>
                {downloading ? 'Decrypting & downloading…' : 'Download file'}
              </button>
            ) : (
              <div style={{ width: '100%', padding: '12px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '8px', fontSize: '13px', color: '#555e78', textAlign: 'center' }}>
                View only — download not permitted with this link
              </div>
            )}

            <div style={{ marginTop: '14px', fontSize: '11px', color: '#555e78', textAlign: 'center' }}>
              Secured by CryptNest · {accessCount} access{accessCount !== 1 ? 'es' : ''}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
