'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime(), m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'; if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'
  return Math.floor(h / 24) + 'd ago'
}

export default function SecurityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState('dna')
  const fileRef = useRef()

  // DNA state
  const [dnaFile, setDnaFile] = useState(null)
  const [dnaScanning, setDnaScanning] = useState(false)
  const [dnaResult, setDnaResult] = useState(null)
  const [dnaError, setDnaError] = useState('')

  // Immune system state
  const [immuneData, setImmuneData] = useState(null)
  const [immuneLoading, setImmuneLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetail, setUserDetail] = useState(null)
  const [locking, setLocking] = useState(null)
  const [msg, setMsg] = useState('')

  // Custody state
  const [custodyFileId, setCustodyFileId] = useState('')
  const [custodyData, setCustodyData] = useState(null)
  const [custodyLoading, setCustodyLoading] = useState(false)
  const [custodyError, setCustodyError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !['superadmin', 'admin'].includes(session?.user?.role)) router.push('/dashboard')
  }, [status, session])

  useEffect(() => {
    if (tab === 'immune' && !immuneData) fetchImmune()
  }, [tab])

  async function fetchImmune() {
    setImmuneLoading(true)
    const r = await fetch('/api/admin/immune')
    const d = await r.json()
    if (!d.error) setImmuneData(d)
    setImmuneLoading(false)
  }

  async function fetchUserDetail(userId) {
    setSelectedUser(userId)
    const r = await fetch('/api/admin/immune?userId=' + userId)
    const d = await r.json()
    if (!d.error) setUserDetail(d)
  }

  async function handleLock(userId, action) {
    setLocking(userId)
    const r = await fetch('/api/admin/immune', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action }) })
    const d = await r.json()
    if (d.success) { setMsg(`✓ User ${action}ed successfully`); fetchImmune() }
    else setMsg('✗ ' + d.error)
    setLocking(null)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleDnaScan(e) {
    const file = e.target.files?.[0]; if (!file) return
    setDnaFile(file); setDnaScanning(true); setDnaResult(null); setDnaError('')
    const fd = new FormData(); fd.append('file', file)
    try {
      const r = await fetch('/api/files/scan-dna', { method: 'POST', body: fd })
      const d = await r.json()
      if (d.error) setDnaError(d.error)
      else setDnaResult(d)
    } catch (err) { setDnaError(err.message) }
    finally { setDnaScanning(false); fileRef.current.value = '' }
  }

  async function fetchCustody() {
    if (!custodyFileId.trim()) return
    setCustodyLoading(true); setCustodyError(''); setCustodyData(null)
    try {
      const r = await fetch('/api/files/custody?fileId=' + custodyFileId.trim())
      const d = await r.json()
      if (d.error) setCustodyError(d.error)
      else setCustodyData(d)
    } catch (err) { setCustodyError(err.message) }
    finally { setCustodyLoading(false) }
  }

  if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f1117', color: '#e8ecf4' }}>Loading…</div>

  const threatColors = { critical: { bg: '#2a0e0e', tc: '#f87171', dot: '#f05b5b' }, warning: { bg: '#2e2008', tc: '#f4a829', dot: '#f4a829' }, safe: { bg: '#0e2a1a', tc: '#22c97e', dot: '#22c97e' } }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Security Center" subtitle="DNA · Immune System · Chain of Custody">
          {msg && <span style={{ fontSize: '11px', color: msg.startsWith('✓') ? '#22c97e' : '#f05b5b' }}>{msg}</span>}
        </TopBar>

        <div style={{ display: 'flex', borderBottom: '1px solid #2e3650', background: '#181c27', padding: '0 20px', flexShrink: 0 }}>
          {[['dna', '🧬 File DNA'], ['immune', '🛡️ Immune System'], ['custody', '⛓️ Chain of Custody']].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: tab === t ? '#f4a829' : '#8b93aa', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #f4a829' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
          ))}
        </div>

        <div className="page-content">

          {/* ── DNA TAB ── */}
          {tab === 'dna' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="card">
                  <div className="card-hdr"><span className="card-title">🧬 How File DNA works</span></div>
                  {[['Every download', 'Gets a unique invisible watermark embedded silently'],['Zero-width chars', 'Injected between words — invisible to human eye'],['Binary files', 'DNA signature appended to file bytes'],['If leaked', 'Upload the leaked file here → instantly know who leaked it']].map(([t, d]) => (
                    <div key={t} style={{ display: 'flex', gap: '10px', padding: '7px 0', borderBottom: '1px solid #2e3650' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#f4a829', minWidth: '110px', flexShrink: 0 }}>{t}</div>
                      <div style={{ fontSize: '11px', color: '#8b93aa' }}>{d}</div>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <div className="card-hdr"><span className="card-title">🔍 Scan leaked file</span></div>
                  <p style={{ fontSize: '12px', color: '#8b93aa', marginBottom: '16px', lineHeight: 1.6 }}>Upload a suspected leaked file. CryptNest will scan it for DNA watermarks and identify exactly who downloaded it.</p>
                  <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleDnaScan} />
                  <button onClick={() => fileRef.current?.click()} disabled={dnaScanning} className="btn-amber" style={{ width: '100%', justifyContent: 'center', marginBottom: '14px' }}>
                    {dnaScanning ? '🔍 Scanning for DNA…' : '📁 Upload leaked file to scan'}
                  </button>
                  {dnaFile && !dnaScanning && <div style={{ fontSize: '11px', color: '#555e78', marginBottom: '10px' }}>File: {dnaFile.name}</div>}

                  {dnaError && <div style={{ background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#f87171' }}>{dnaError}</div>}

                  {dnaResult && (
                    <div style={{ background: dnaResult.matched ? '#0e2a1a' : '#2e2008', border: `1px solid ${dnaResult.matched ? '#22c97e' : '#f4a829'}`, borderRadius: '8px', padding: '14px' }}>
                      {dnaResult.matched ? (
                        <>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#f05b5b', marginBottom: '10px' }}>⚠️ Leak traced!</div>
                          {[['DNA Tag', dnaResult.dnaTag], ['Leaked by', dnaResult.leakedBy?.name], ['Email', dnaResult.leakedBy?.email], ['Downloaded at', new Date(dnaResult.leakedBy?.downloadedAt).toLocaleString()], ['IP Address', dnaResult.leakedBy?.ip], ['Original file', dnaResult.file]].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #2e3650', fontSize: '12px' }}>
                              <span style={{ color: '#8b93aa' }}>{k}</span>
                              <span style={{ color: '#e8ecf4', fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div style={{ fontSize: '12px', color: '#f4a829' }}>{dnaResult.message}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-hdr"><span className="card-title">📋 DNA is automatically embedded on every download</span></div>
                <p style={{ fontSize: '12px', color: '#8b93aa', lineHeight: 1.6 }}>Every time any user downloads a file through CryptNest, a unique DNA watermark is automatically embedded. No action needed. The watermark is logged in the audit trail with the DNA tag. Use the scanner above to identify leaks.</p>
                <div style={{ marginTop: '10px', padding: '10px', background: '#1e2435', borderRadius: '6px', fontSize: '11px', color: '#555e78', fontFamily: 'monospace' }}>
                  DNA-00001 → James Wilson · downloaded Q3-Report.pdf · Mar 21 11:32am · 106.192.67.235<br />
                  DNA-00002 → Priya Sharma · downloaded budget.xlsx · Mar 21 2:15pm · 106.192.67.235<br />
                  DNA-00003 → Sana Ali · downloaded contracts.pdf · Mar 22 9:44am · 182.74.120.88
                </div>
              </div>
            </>
          )}

          {/* ── IMMUNE SYSTEM TAB ── */}
          {tab === 'immune' && (
            <>
              {immuneLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#555e78' }}>Analysing user behaviour…</div>
              ) : immuneData ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '14px' }}>
                    {[['Total users', immuneData.total, '#3c82f6'], ['Critical threats', immuneData.critical, '#f05b5b'], ['Warnings', immuneData.warnings, '#f4a829'], ['Safe users', immuneData.total - immuneData.critical - immuneData.warnings, '#22c97e']].map(([l, v, c]) => (
                      <div key={l} className="metric-card">
                        <div className="metric-label"><div className="metric-dot" style={{ background: c }} />{l}</div>
                        <div className="metric-val">{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '14px' }}>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>{['User', 'Role', 'Risk score', 'Threat', 'Top signal', 'Action'].map(h => (
                          <th key={h} style={{ fontSize: '10px', color: '#555e78', letterSpacing: '.8px', textTransform: 'uppercase', fontWeight: 500, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #2e3650', background: '#181c27' }}>{h}</th>
                        ))}</tr></thead>
                        <tbody>
                          {immuneData.users.map(u => {
                            const tc = threatColors[u.threatLevel]
                            const initials = u.user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                            return (
                              <tr key={u.user.id} style={{ cursor: 'pointer', background: selectedUser === u.user.id ? '#1e2435' : 'transparent' }}
                                onClick={() => fetchUserDetail(u.user.id)}
                                onMouseEnter={e => { if (selectedUser !== u.user.id) e.currentTarget.style.background = '#181c27' }}
                                onMouseLeave={e => { if (selectedUser !== u.user.id) e.currentTarget.style.background = 'transparent' }}>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#252c3e', color: '#f4a829', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>{initials}</div>
                                    <div>
                                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8ecf4' }}>{u.user.name}</div>
                                      <div style={{ fontSize: '10px', color: '#555e78' }}>{u.user.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650', fontSize: '11px', color: '#8b93aa', textTransform: 'capitalize' }}>{u.user.role}</td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ height: '5px', width: '80px', background: '#252c3e', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${u.riskScore}%`, background: tc.dot, borderRadius: '3px' }} />
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: tc.tc }}>{u.riskScore}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: tc.bg, color: tc.tc }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: tc.dot, display: 'inline-block' }} />{u.threatLevel}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650', fontSize: '11px', color: '#8b93aa', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {u.topReason ? u.topReason.signal : u.hasEnoughData ? 'Normal' : 'Learning…'}
                                </td>
                                <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}>
                                  {u.riskScore >= 50 && (
                                    <button onClick={e => { e.stopPropagation(); handleLock(u.user.id, 'lock') }} disabled={locking === u.user.id} style={{ padding: '3px 8px', background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '4px', fontSize: '10px', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit' }}>
                                      {locking === u.user.id ? 'Locking…' : 'Lock'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* User detail panel */}
                    {userDetail && (
                      <div className="card" style={{ position: 'sticky', top: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8ecf4' }}>{userDetail.user?.name}</span>
                          <button onClick={() => { setSelectedUser(null); setUserDetail(null) }} style={{ background: 'none', border: 'none', color: '#8b93aa', cursor: 'pointer', fontSize: '18px' }}>×</button>
                        </div>
                        <div style={{ fontSize: '11px', color: '#555e78', marginBottom: '10px' }}>Risk score: <strong style={{ color: userDetail.anomaly?.score >= 70 ? '#f05b5b' : userDetail.anomaly?.score >= 40 ? '#f4a829' : '#22c97e' }}>{userDetail.anomaly?.score}/100</strong></div>

                        {userDetail.baseline ? (
                          <>
                            <div style={{ fontSize: '11px', color: '#8b93aa', marginBottom: '6px', fontWeight: 600 }}>Normal behaviour baseline</div>
                            {[['Active hours', `${userDetail.baseline.minHour}:00 – ${userDetail.baseline.maxHour}:00`], ['Known IPs', userDetail.baseline.knownIPs.length + ' addresses'], ['Avg downloads/day', userDetail.baseline.avgDownloadsPerDay.toFixed(1)]].map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #2e3650', fontSize: '11px' }}>
                                <span style={{ color: '#8b93aa' }}>{k}</span>
                                <span style={{ color: '#e8ecf4', fontWeight: 600 }}>{v}</span>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div style={{ padding: '12px', background: '#1e2435', borderRadius: '6px', fontSize: '12px', color: '#555e78', textAlign: 'center' }}>
                            Still learning behaviour… Check back after 7 days of activity.
                          </div>
                        )}

                        {userDetail.anomaly?.reasons?.length > 0 && (
                          <>
                            <div style={{ fontSize: '11px', color: '#f05b5b', marginTop: '12px', marginBottom: '6px', fontWeight: 600 }}>Anomaly signals detected</div>
                            {userDetail.anomaly.reasons.map((r, i) => (
                              <div key={i} style={{ padding: '8px', background: '#2a0e0e', borderRadius: '6px', marginBottom: '6px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: '#f87171' }}>{r.signal} (+{r.weight}pts)</div>
                                <div style={{ fontSize: '10px', color: '#f05b5b', marginTop: '3px' }}>{r.detail}</div>
                              </div>
                            ))}
                          </>
                        )}

                        <button onClick={() => handleLock(userDetail.user?._id, 'lock')} style={{ width: '100%', marginTop: '12px', padding: '8px', background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '6px', fontSize: '12px', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                          Lock this account
                        </button>
                        <button onClick={() => handleLock(userDetail.user?._id, 'unlock')} style={{ width: '100%', marginTop: '6px', padding: '8px', background: '#0e2a1a', border: '1px solid #22c97e', borderRadius: '6px', fontSize: '12px', color: '#22c97e', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                          Unlock account
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </>
          )}

          {/* ── CHAIN OF CUSTODY TAB ── */}
          {tab === 'custody' && (
            <>
              <div className="card" style={{ marginBottom: '14px' }}>
                <div className="card-hdr"><span className="card-title">⛓️ Verify file chain of custody</span></div>
                <p style={{ fontSize: '12px', color: '#8b93aa', marginBottom: '14px', lineHeight: 1.6 }}>Enter a File ID to view its complete tamper-proof custody chain. Every upload, download, share and edit is recorded as a cryptographic block. If anyone tampers with the file, the chain breaks.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input value={custodyFileId} onChange={e => setCustodyFileId(e.target.value)} placeholder="Paste file ID from audit logs…" className="input" style={{ flex: 1 }} onFocus={e => e.target.style.borderColor = '#f4a829'} onBlur={e => e.target.style.borderColor = '#2e3650'} onKeyDown={e => e.key === 'Enter' && fetchCustody()} />
                  <button onClick={fetchCustody} disabled={custodyLoading} className="btn-amber">{custodyLoading ? 'Verifying…' : 'Verify chain'}</button>
                </div>
                {custodyError && <div style={{ marginTop: '10px', padding: '10px', background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '6px', fontSize: '12px', color: '#f87171' }}>{custodyError}</div>}
              </div>

              {custodyData && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    {[['File', custodyData.file.name, '#3c82f6'], ['Total blocks', custodyData.totalBlocks, '#f4a829'], ['Chain status', custodyData.verification.valid ? 'Verified ✓' : 'TAMPERED!', custodyData.verification.valid ? '#22c97e' : '#f05b5b'], ['Generated', new Date(custodyData.generatedAt).toLocaleTimeString(), '#8b93aa']].map(([l, v, c]) => (
                      <div key={l} className="metric-card">
                        <div className="metric-label"><div className="metric-dot" style={{ background: c }} />{l}</div>
                        <div style={{ fontSize: v?.length > 10 ? '13px' : '18px', fontWeight: 700, color: c, marginTop: '4px' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {!custodyData.verification.valid && (
                    <div style={{ padding: '12px 14px', background: '#2a0e0e', border: '1px solid #7a1f1f', borderRadius: '8px', marginBottom: '14px', fontSize: '12px', color: '#f87171', fontWeight: 600 }}>
                      ⚠️ Chain integrity compromised at block {custodyData.verification.tamperedAt}! This file may have been tampered with.
                    </div>
                  )}

                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: '#181c27', borderBottom: '1px solid #2e3650', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#e8ecf4' }}>Complete custody chain — {custodyData.totalBlocks} blocks</span>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#555e78' }}>Final hash: {custodyData.chainHash.slice(0, 16)}…</span>
                    </div>
                    {custodyData.chain.map((block, i) => {
                      const isTampered = !custodyData.verification.valid && custodyData.verification.tamperedAt === i
                      const actionColors = { upload: '#22c97e', download: '#60a5fa', delete: '#f87171', share: '#a78bfa', login: '#22c97e', rename: '#f4a829', move: '#38bdf8', permission: '#f472b6' }
                      return (
                        <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #2e3650', background: isTampered ? '#2a0e0e' : i % 2 === 0 ? '#181c27' : 'transparent' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: isTampered ? '#7a1f1f' : '#252c3e', color: isTampered ? '#f87171' : '#8b93aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, flexShrink: 0 }}>{i}</div>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#1e2435', color: actionColors[block.action] || '#8b93aa', fontWeight: 600 }}>{block.action}</span>
                            <span style={{ fontSize: '11px', color: '#e8ecf4', fontWeight: 600 }}>{block.user}</span>
                            <span style={{ fontSize: '10px', color: '#555e78', marginLeft: 'auto' }}>{new Date(block.timestamp).toLocaleString()}</span>
                            {isTampered ? (
                              <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 700 }}>⚠ TAMPERED</span>
                            ) : (
                              <span style={{ fontSize: '10px', color: '#22c97e' }}>✓ Valid</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', paddingLeft: '32px' }}>
                            <span style={{ fontSize: '10px', color: '#555e78' }}>IP: <span style={{ color: '#8b93aa', fontFamily: 'monospace' }}>{block.ip}</span></span>
                            <span style={{ fontSize: '10px', color: '#555e78' }}>Hash: <span style={{ color: '#555e78', fontFamily: 'monospace' }}>{block.blockHash.slice(0, 20)}…</span></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => {
                      const cert = `CHAIN OF CUSTODY CERTIFICATE\nCryptNest Security Center\n${'='.repeat(50)}\n\nFile: ${custodyData.file.name}\nFile ID: ${custodyData.file.id}\nCreated: ${new Date(custodyData.file.createdAt).toLocaleString()}\nTotal events: ${custodyData.totalBlocks}\nChain status: ${custodyData.verification.valid ? 'VERIFIED INTACT' : 'TAMPERED'}\nFinal hash: ${custodyData.chainHash}\nGenerated: ${new Date(custodyData.generatedAt).toLocaleString()}\n\n${'='.repeat(50)}\nEVENT LOG\n${'='.repeat(50)}\n${custodyData.chain.map((b, i) => `\n[Block ${i}] ${b.action.toUpperCase()}\nUser: ${b.user} (${b.email})\nTime: ${new Date(b.timestamp).toLocaleString()}\nIP: ${b.ip}\nHash: ${b.blockHash}\nPrev: ${b.prevHash}`).join('\n')}\n\n${'='.repeat(50)}\nThis certificate was generated by CryptNest and proves the\nabove file has not been tampered with at any recorded point.`
                      const blob = new Blob([cert], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href = url; a.download = `custody-certificate-${Date.now()}.txt`; a.click()
                      URL.revokeObjectURL(url)
                    }} className="btn-amber">Download custody certificate</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
