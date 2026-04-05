'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

const FILE_COLORS = {
  pdf:{bg:'#1e3a5f',tc:'#60a5fa'},xlsx:{bg:'#1a2e1a',tc:'#4ade80'},docx:{bg:'#1a2e3a',tc:'#38bdf8'},
  zip:{bg:'#2e1e0a',tc:'#fb923c'},pptx:{bg:'#2a1428',tc:'#f472b6'},sql:{bg:'#2a1e42',tc:'#a78bfa'},
  png:{bg:'#1a2a1a',tc:'#4ade80'},jpg:{bg:'#1a2a1a',tc:'#4ade80'},default:{bg:'#252c3e',tc:'#8b93aa'},
}
const getColor = n => FILE_COLORS[n?.split('.').pop()?.toLowerCase()] || FILE_COLORS.default
const getExt = n => (n?.split('.').pop()?.toUpperCase() || 'FILE').slice(0,4)
const fmtBytes = b => { if(!b)return'0 B'; if(b<1048576)return(b/1024).toFixed(1)+' KB'; if(b<1073741824)return(b/1048576).toFixed(1)+' MB'; return(b/1073741824).toFixed(2)+' GB' }
const timeAgo = d => { const diff=Date.now()-new Date(d).getTime(),m=Math.floor(diff/60000); if(m<60)return m+'m ago'; const h=Math.floor(m/60); if(h<24)return h+'h ago'; return Math.floor(h/24)+'d ago' }

export default function StarredPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => { if(status==='unauthenticated') router.push('/login') }, [status])
  useEffect(() => { if(status==='authenticated') fetchStarred() }, [status])

  async function fetchStarred() {
    setLoading(true)
    const r = await fetch('/api/files/list?starred=true')
    const d = await r.json()
    setFiles(d.files || [])
    setLoading(false)
  }

  async function toggleStar(file) {
    const r = await fetch('/api/files/star', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: file._id }) })
    const d = await r.json()
    if (d.success) { setMsg(d.starred ? '⭐ Starred!' : '✓ Unstarred'); fetchStarred() }
    setTimeout(() => setMsg(''), 2000)
  }

  async function handleDownload(file) {
    const r = await fetch('/api/files/download?id=' + file._id)
    if (!r.ok) return
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = file.originalName || file.name; a.click()
    URL.revokeObjectURL(url)
  }

  if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f1117', color: '#e8ecf4' }}>Loading…</div>

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Starred Files" subtitle={`${files.length} starred`}>
          {msg && <span style={{ fontSize: '11px', color: '#f4a829' }}>{msg}</span>}
        </TopBar>

        <div className="page-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#555e78' }}>Loading…</div>
          ) : files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#e8ecf4', marginBottom: '6px' }}>No starred files</div>
              <div style={{ fontSize: '13px', color: '#555e78' }}>Star files in the file browser to find them quickly here</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              {files.map(f => {
                const clr = getColor(f.name)
                return (
                  <div key={f._id} style={{ background: '#181c27', border: '1px solid #2e3650', borderRadius: '9px', padding: '12px', position: 'relative' }}>
                    <button onClick={() => toggleStar(f)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#f4a829', lineHeight: 1 }}>⭐</button>
                    <div style={{ height: '68px', background: '#1e2435', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', fontSize: '18px', fontWeight: 800, color: clr.tc }}>{getExt(f.name)}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#e8ecf4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{f.name}</div>
                    <div style={{ fontSize: '10px', color: '#555e78', marginBottom: '8px' }}>{fmtBytes(f.sizeBytes)} · {timeAgo(f.createdAt)}</div>
                    <button onClick={() => handleDownload(f)} style={{ width: '100%', padding: '5px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '5px', fontSize: '10px', color: '#60a5fa', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Download</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
