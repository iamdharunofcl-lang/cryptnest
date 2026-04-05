'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'member', department: '' })
  const [inviting, setInviting] = useState(false)
  const [msg, setMsg] = useState('')
  const [quotaModal, setQuotaModal] = useState(null)
  const [newQuota, setNewQuota] = useState(100)
  const barChartRef = useRef(null)
  const donutChartRef = useRef(null)
  const barInstance = useRef(null)
  const donutInstance = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !['superadmin', 'admin', 'manager'].includes(session?.user?.role)) router.push('/dashboard')
    if (status === 'authenticated' && session?.user?.role === 'manager') setTab('analytics')
  }, [status, session])

  useEffect(() => {
    if (status === 'authenticated') { fetchUsers(); fetchDepts() }
  }, [status, search, roleFilter, statusFilter])

  useEffect(() => {
    if (tab === 'analytics') fetchAnalytics()
  }, [tab])

  useEffect(() => {
    if (analytics && tab === 'analytics') renderCharts()
  }, [analytics, tab])

  async function fetchUsers() {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (roleFilter) p.set('role', roleFilter)
    if (statusFilter) p.set('status', statusFilter)
    const r = await fetch('/api/users?' + p)
    const d = await r.json()
    setUsers(d.users || [])
    setLoading(false)
  }

  async function fetchDepts() {
    const r = await fetch('/api/departments')
    const d = await r.json()
    setDepartments(d.departments || [])
  }

  async function fetchAnalytics() {
    const r = await fetch('/api/analytics')
    const d = await r.json()
    if (!d.error) setAnalytics(d)
  }

  function renderCharts() {
    if (typeof window === 'undefined') return
    const script = document.getElementById('chartjs-script')
    if (!script) {
      const s = document.createElement('script')
      s.id = 'chartjs-script'
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
      s.onload = () => drawCharts()
      document.head.appendChild(s)
    } else if (window.Chart) {
      drawCharts()
    }
  }

  function drawCharts() {
    if (!analytics || !window.Chart) return

    // Bar chart - monthly uploads
    if (barChartRef.current) {
      if (barInstance.current) barInstance.current.destroy()
      barInstance.current = new window.Chart(barChartRef.current, {
        type: 'bar',
        data: {
          labels: analytics.monthlyUploads.map(m => m.label),
          datasets: [{
            label: 'Uploads',
            data: analytics.monthlyUploads.map(m => m.count),
            backgroundColor: '#f4a829',
            borderRadius: 6,
            barThickness: 28,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#555e78', font: { size: 11 } }, grid: { display: false }, border: { display: false } },
            y: { ticks: { color: '#555e78', font: { size: 10 }, stepSize: 1 }, grid: { color: '#2e3650' }, border: { display: false } },
          },
        },
      })
    }

    // Donut chart - storage by dept
    if (donutChartRef.current && analytics.deptStorage.length > 0) {
      if (donutInstance.current) donutInstance.current.destroy()
      donutInstance.current = new window.Chart(donutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: analytics.deptStorage.map(d => d.name),
          datasets: [{
            data: analytics.deptStorage.map(d => parseFloat(d.usedGB.toFixed(2))),
            backgroundColor: analytics.deptStorage.map(d => d.color || '#f4a829'),
            borderWidth: 0,
            hoverOffset: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(2)} GB` } } },
        },
      })
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    setInviting(true)
    const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inviteForm) })
    const d = await r.json()
    if (d.success) { setMsg('✓ User invited!'); setInviteForm({ name: '', email: '', role: 'member', department: '' }); fetchUsers() }
    else setMsg('✗ ' + d.error)
    setInviting(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function toggleActive(user) {
    await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: user._id, isActive: !user.isActive }) })
    fetchUsers()
  }

  async function saveQuota() {
    await fetch('/api/departments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: quotaModal._id, quotaGB: newQuota }) })
    fetchDepts(); setQuotaModal(null); setMsg('✓ Quota updated!'); setTimeout(() => setMsg(''), 3000)
  }

  const roleColors = {
    superadmin: { bg: '#2a1428', tc: '#f472b6' },
    admin: { bg: '#1e2e42', tc: '#60a5fa' },
    manager: { bg: '#1a2e1a', tc: '#4ade80' },
    member: { bg: '#252c3e', tc: '#8b93aa' },
    viewer: { bg: '#1e2435', tc: '#555e78' },
  }

  if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f1117', color: '#e8ecf4' }}>Loading…</div>

  const inputStyle = { width: '100%', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: '#e8ecf4', outline: 'none', fontFamily: 'inherit' }

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Admin Panel" subtitle="Super Admin" onSearch={v => setSearch(v)}>
          {msg && <span style={{ fontSize: '11px', color: msg.startsWith('✓') ? '#22c97e' : '#f05b5b' }}>{msg}</span>}
        </TopBar>

        <div style={{ display: 'flex', borderBottom: '1px solid #2e3650', background: '#181c27', padding: '0 20px', flexShrink: 0 }}>
          {['users', 'departments', 'analytics'].filter(t => {
            if (session?.user?.role === 'manager') return t === 'analytics'
            return true
          }).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: tab === t ? '#f4a829' : '#8b93aa', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #f4a829' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{t}</button>
          ))}
        </div>

        <div className="page-content">

          {/* USERS TAB */}
          {tab === 'users' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Total users', value: users.length, dot: '#3c82f6' },
                  { label: 'Active', value: users.filter(u => u.isActive).length, dot: '#22c97e' },
                  { label: 'Suspended', value: users.filter(u => !u.isActive).length, dot: '#f05b5b' },
                  { label: 'Departments', value: departments.length, dot: '#f4a829' },
                ].map((m, i) => (
                  <div key={i} className="metric-card">
                    <div className="metric-label"><div className="metric-dot" style={{ background: m.dot }} />{m.label}</div>
                    <div className="metric-val">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ marginBottom: '14px' }}>
                <div className="card-hdr"><span className="card-title">Invite new user</span></div>
                <form onSubmit={handleInvite} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 130px auto', gap: '10px', alignItems: 'end' }}>
                  <div><label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px' }}>Full name</label><input style={inputStyle} value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="John Smith" required /></div>
                  <div><label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px' }}>Work email</label><input style={inputStyle} type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="john@acme.com" required /></div>
                  <div><label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px' }}>Role</label>
                    <select style={inputStyle} value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}>
                      {['member', 'viewer', 'manager', 'admin'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label style={{ fontSize: '11px', color: '#8b93aa', display: 'block', marginBottom: '5px' }}>Department</label>
                    <select style={inputStyle} value={inviteForm.department} onChange={e => setInviteForm(p => ({ ...p, department: e.target.value }))}>
                      <option value="">None</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={inviting} className="btn-amber">{inviting ? 'Inviting…' : '+ Invite'}</button>
                </form>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                  { value: roleFilter, set: setRoleFilter, options: ['superadmin', 'admin', 'manager', 'member', 'viewer'], placeholder: 'All roles' },
                  { value: statusFilter, set: setStatusFilter, options: ['Active', 'Inactive'], placeholder: 'All status' },
                ].map((f, i) => (
                  <select key={i} value={f.value} onChange={e => f.set(e.target.value)} style={{ background: '#1e2435', border: '1px solid #2e3650', borderRadius: '6px', color: '#8b93aa', fontSize: '11px', padding: '5px 8px', outline: 'none', fontFamily: 'inherit' }}>
                    <option value="">{f.placeholder}</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
                <span style={{ fontSize: '11px', color: '#555e78', alignSelf: 'center' }}>{users.length} users</span>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['User', 'Department', 'Role', 'Status', 'Last login', 'Actions'].map(h => (
                    <th key={h} style={{ fontSize: '10px', color: '#555e78', letterSpacing: '.8px', textTransform: 'uppercase', fontWeight: 500, padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #2e3650', background: '#181c27' }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#555e78' }}>Loading…</td></tr>
                      : users.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#555e78' }}>No users found</td></tr>
                        : users.map(u => {
                          const initials = u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
                          const rc = roleColors[u.role] || roleColors.member
                          return (
                            <tr key={u._id} onMouseEnter={e => e.currentTarget.style.background = '#1e2435'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#252c3e', color: '#f4a829', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                                  <div><div style={{ fontSize: '12px', fontWeight: 600, color: '#e8ecf4' }}>{u.name}</div><div style={{ fontSize: '10px', color: '#555e78' }}>{u.email}</div></div>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650', fontSize: '11px', color: '#8b93aa' }}>{u.department?.name || '—'}</td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}><span style={{ background: rc.bg, color: rc.tc, fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{u.role}</span></td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}><span style={{ fontSize: '11px', color: u.isActive ? '#22c97e' : '#f05b5b', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: u.isActive ? '#22c97e' : '#f05b5b', display: 'inline-block' }} />{u.isActive ? 'Active' : 'Suspended'}</span></td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650', fontSize: '11px', color: '#555e78' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</td>
                              <td style={{ padding: '10px 12px', borderBottom: '1px solid #2e3650' }}>
                                <button onClick={() => toggleActive(u)} style={{ padding: '3px 8px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '4px', fontSize: '10px', color: u.isActive ? '#f87171' : '#22c97e', cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {u.isActive ? 'Suspend' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* DEPARTMENTS TAB */}
          {tab === 'departments' && (
            <>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#e8ecf4', marginBottom: '14px' }}>Department storage quotas</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {departments.map(d => {
                  const pct = d.quotaGB > 0 ? Math.min(100, Math.round((d.usedGB / d.quotaGB) * 100)) : 0
                  const barColor = pct > 80 ? '#f05b5b' : pct > 60 ? '#f4a829' : d.color || '#3c82f6'
                  return (
                    <div key={d._id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color || '#f4a829' }} />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8ecf4' }}>{d.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '12px', color: '#8b93aa' }}>{d.usedGB.toFixed(2)} / {d.quotaGB} GB</span>
                          <button onClick={() => { setQuotaModal(d); setNewQuota(d.quotaGB) }} style={{ padding: '4px 10px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '5px', fontSize: '10px', color: '#f4a829', cursor: 'pointer', fontFamily: 'inherit' }}>Edit quota</button>
                        </div>
                      </div>
                      <div style={{ height: '6px', background: '#252c3e', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: '.3s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10px', color: '#555e78' }}>{pct}% used · {d.members?.length || 0} members</span>
                        {pct > 80 && <span style={{ fontSize: '10px', color: '#f05b5b', fontWeight: 600 }}>Near quota limit!</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ANALYTICS TAB */}
          {tab === 'analytics' && (
            <>
              {!analytics ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#555e78' }}>Loading analytics…</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '12px', marginBottom: '16px' }}>
                    {[
                      { label: 'Total uploads (6mo)', value: analytics.monthlyUploads.reduce((s, m) => s + m.count, 0).toLocaleString(), dot: '#f4a829' },
                      { label: 'Departments', value: analytics.deptStorage.length, dot: '#3c82f6' },
                      { label: 'File types tracked', value: analytics.fileTypes.length, dot: '#22c97e' },
                      { label: 'Actions (30d)', value: analytics.actionBreakdown.reduce((s, a) => s + a.count, 0).toLocaleString(), dot: '#a78bfa' },
                    ].map((m, i) => (
                      <div key={i} className="metric-card">
                        <div className="metric-label"><div className="metric-dot" style={{ background: m.dot }} />{m.label}</div>
                        <div className="metric-val">{m.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    {/* Monthly uploads bar chart */}
                    <div className="card">
                      <div className="card-hdr"><span className="card-title">Monthly uploads (last 6 months)</span></div>
                      <div style={{ position: 'relative', width: '100%', height: '220px' }}>
                        <canvas ref={barChartRef}></canvas>
                      </div>
                    </div>

                    {/* Dept storage donut */}
                    <div className="card">
                      <div className="card-hdr"><span className="card-title">Storage by department</span></div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                        {analytics.deptStorage.map(d => (
                          <span key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8b93aa' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, display: 'inline-block' }} />
                            {d.name} {d.usedGB.toFixed(1)}GB
                          </span>
                        ))}
                      </div>
                      <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                        <canvas ref={donutChartRef}></canvas>
                      </div>
                    </div>
                  </div>

                  {/* Action breakdown + File types */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div className="card">
                      <div className="card-hdr"><span className="card-title">Actions breakdown (last 30 days)</span></div>
                      {analytics.actionBreakdown.map(a => {
                        const max = analytics.actionBreakdown[0]?.count || 1
                        const pct = Math.round((a.count / max) * 100)
                        const colors = { upload: '#22c97e', download: '#60a5fa', delete: '#f87171', share: '#a78bfa', login: '#4ade80', logout: '#8b93aa', permission: '#f472b6', rename: '#f4a829', move: '#38bdf8' }
                        return (
                          <div key={a._id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#e8ecf4', fontWeight: 600, textTransform: 'capitalize' }}>{a._id}</span>
                              <span style={{ fontSize: '11px', color: '#8b93aa' }}>{a.count.toLocaleString()}</span>
                            </div>
                            <div style={{ height: '5px', background: '#252c3e', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: colors[a._id] || '#f4a829', borderRadius: '3px' }} />
                            </div>
                          </div>
                        )
                      })}
                      {analytics.actionBreakdown.length === 0 && <div style={{ color: '#555e78', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No actions yet</div>}
                    </div>

                    <div className="card">
                      <div className="card-hdr"><span className="card-title">Top file types</span></div>
                      {analytics.fileTypes.map((f, i) => (
                        <div key={f._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: i < analytics.fileTypes.length - 1 ? '1px solid #2e3650' : 'none' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#1e2435', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#f4a829', flexShrink: 0 }}>{f._id.toUpperCase().slice(0, 4)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#e8ecf4' }}>.{f._id}</div>
                            <div style={{ fontSize: '10px', color: '#555e78' }}>{f.count} files</div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#8b93aa' }}>{f.size > 1073741824 ? (f.size / 1073741824).toFixed(1) + ' GB' : f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : (f.size / 1024).toFixed(1) + ' KB'}</span>
                        </div>
                      ))}
                      {analytics.fileTypes.length === 0 && <div style={{ color: '#555e78', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No files yet</div>}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Quota Modal */}
        {quotaModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setQuotaModal(null)}>
            <div style={{ background: '#181c27', border: '1px solid #2e3650', borderRadius: '12px', padding: '24px', width: '340px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8ecf4', marginBottom: '16px' }}>Edit quota — {quotaModal.name}</h3>
              <div style={{ textAlign: 'center', fontSize: '32px', fontWeight: 700, color: '#f4a829', marginBottom: '12px' }}>{newQuota} <span style={{ fontSize: '16px', color: '#8b93aa', fontWeight: 400 }}>GB</span></div>
              <input type="range" min="1" max="1000" step="1" value={newQuota} onChange={e => setNewQuota(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#f4a829', marginBottom: '6px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555e78', marginBottom: '20px' }}><span>1 GB</span><span>1000 GB</span></div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setQuotaModal(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button onClick={saveQuota} className="btn-amber" style={{ flex: 1, justifyContent: 'center' }}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
