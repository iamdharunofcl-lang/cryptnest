'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

function formatBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB'
  return (b / 1073741824).toFixed(2) + ' GB'
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h ago'
  return Math.floor(h / 24) + 'd ago'
}

const FILE_COLORS = {
  pdf: { bg: '#1e3a5f', tc: '#60a5fa' }, xlsx: { bg: '#1a2e1a', tc: '#4ade80' },
  docx: { bg: '#1a2e3a', tc: '#38bdf8' }, zip: { bg: '#2e1e0a', tc: '#fb923c' },
  pptx: { bg: '#2a1428', tc: '#f472b6' }, default: { bg: '#252c3e', tc: '#8b93aa' },
}
function getColor(name) { return FILE_COLORS[name?.split('.').pop()?.toLowerCase()] || FILE_COLORS.default }
function getExt(name) { return (name?.split('.').pop()?.toUpperCase() || 'FILE').slice(0, 4) }

export default function RecyclePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status])
  useEffect(() => { if (status === 'authenticated') fetchDeleted() }, [status])

  async function fetchDeleted() {
    setLoading(true)
    const res = await fetch('/api/files/list?deleted=true')
    const data = await res.json()
    setFiles(data.files || [])
    setLoading(false)
  }

  async function handleRestore(file) {
    const res = await fetch('/api/files/restore?id=' + file._id, { method: 'PATCH' })
    const data = await res.json()
    if (data.success) { setMsg({ text: '✓ File restored!', type: 'success' }); fetchDeleted() }
    else setMsg({ text: '✗ ' + data.error, type: 'error' })
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  async function handlePermanentDelete(file) {
    if (!confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) return
    const res = await fetch('/api/files/permanent-delete?id=' + file._id, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { setMsg({ text: '✓ Permanently deleted', type: 'success' }); fetchDeleted() }
    else setMsg({ text: '✗ ' + data.error, type: 'error' })
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  async function handleEmptyBin() {
    if (!confirm('Empty the entire recycle bin? All files will be permanently deleted.')) return
    const res = await fetch('/api/files/empty-bin', { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { setMsg({ text: `✓ Emptied bin — ${data.count} files deleted`, type: 'success' }); fetchDeleted() }
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f1117', color: '#e8ecf4' }}>Loading…</div>

  const msgColors = { success: '#22c97e', error: '#f05b5b' }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Recycle Bin" subtitle={`${files.length} deleted files`}>
          {msg.text && <span style={{ fontSize: '11px', color: msgColors[msg.type] }}>{msg.text}</span>}
          {files.length > 0 && (
            <button onClick={handleEmptyBin} style={{ padding: '7px 14px', background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '7px', fontSize: '12px', fontWeight: 600, color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>
              Empty bin
            </button>
          )}
        </TopBar>

        <div className="page-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#555e78' }}>Loading…</div>
          ) : files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗑️</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#e8ecf4', marginBottom: '6px' }}>Recycle bin is empty</div>
              <div style={{ fontSize: '13px', color: '#555e78' }}>Deleted files appear here for 30 days before permanent deletion</div>
            </div>
          ) : (
            <>
              <div style={{ background: '#2e2008', border: '1px solid #7a5214', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#f4a829', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                Files in the recycle bin are automatically deleted after 30 days.
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Name', 'Size', 'Deleted', 'Actions'].map(h => (
                      <th key={h} style={{ fontSize: '10px', color: '#555e78', letterSpacing: '.8px', textTransform: 'uppercase', fontWeight: 500, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #2e3650', background: '#181c27' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {files.map(f => {
                      const clr = getColor(f.name)
                      return (
                        <tr key={f._id} onMouseEnter={e => e.currentTarget.style.background = '#1e2435'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: clr.bg, color: clr.tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0, opacity: 0.6 }}>{getExt(f.name)}</div>
                              <span style={{ fontSize: '12px', color: '#8b93aa', fontStyle: 'italic' }}>{f.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650', fontSize: '11px', color: '#555e78' }}>{formatBytes(f.sizeBytes)}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650', fontSize: '11px', color: '#555e78' }}>{f.deletedAt ? timeAgo(f.deletedAt) : '—'}</td>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleRestore(f)} style={{ padding: '4px 10px', background: '#1a2e1a', border: '1px solid #22c97e', borderRadius: '5px', fontSize: '10px', color: '#22c97e', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Restore</button>
                              <button onClick={() => handlePermanentDelete(f)} style={{ padding: '4px 10px', background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '5px', fontSize: '10px', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Delete forever</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
