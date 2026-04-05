'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

const ACTION_STYLES = {
  upload:{bg:'#1a2e1a',tc:'#4ade80'},download:{bg:'#1a2436',tc:'#60a5fa'},
  delete:{bg:'#2a0e0e',tc:'#f87171'},share:{bg:'#1a1a2e',tc:'#818cf8'},
  login:{bg:'#0e2a1a',tc:'#22c97e'},logout:{bg:'#252c3e',tc:'#8b93aa'},
  permission:{bg:'#2a1428',tc:'#f472b6'},rename:{bg:'#2e2008',tc:'#f4a829'},
  move:{bg:'#1e2e42',tc:'#38bdf8'},
}
const SEV_STYLES = {
  suspicious:{bg:'#2a0e0e',tc:'#f87171',dot:'#f87171',label:'critical'},
  failed:{bg:'#2e2008',tc:'#f4a829',dot:'#f4a829',label:'warning'},
  success:{bg:'#1a2436',tc:'#60a5fa',dot:'#60a5fa',label:'info'},
}

function timeAgo(d) {
  const diff=Date.now()-new Date(d).getTime(),m=Math.floor(diff/60000)
  if(m<1)return'Just now'; if(m<60)return m+'m ago'
  const h=Math.floor(m/60); if(h<24)return h+'h ago'
  return new Date(d).toLocaleDateString()
}

export default function AuditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ total: 0, critical: 0, warnings: 0 })
  const [department, setDepartment] = useState(null)
  const [isFiltered, setIsFiltered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [exportModal, setExportModal] = useState(false)
  const [exportFmt, setExportFmt] = useState('csv')
  const [exporting, setExporting] = useState(false)

  const isManager = session?.user?.role === 'manager'
  const isAdmin = ['superadmin', 'admin'].includes(session?.user?.role)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !['superadmin', 'admin', 'manager'].includes(session?.user?.role)) {
      router.push('/dashboard')
    }
  }, [status, session])

  useEffect(() => { if (status === 'authenticated') fetchLogs() }, [status, search, actionFilter, statusFilter])

  async function fetchLogs() {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (actionFilter) p.set('action', actionFilter)
    if (statusFilter) p.set('status', statusFilter)
    p.set('limit', '100')
    const r = await fetch('/api/audit?' + p)
    const d = await r.json()
    setLogs(d.logs || [])
    setStats({ total: d.total || 0, critical: d.critical || 0, warnings: d.warnings || 0 })
    setDepartment(d.department || null)
    setIsFiltered(d.isFiltered || false)
    setLoading(false)
  }

  async function handleExport() {
    setExporting(true)
    try {
      const p = new URLSearchParams()
      p.set('format', exportFmt)
      if (actionFilter) p.set('action', actionFilter)
      if (statusFilter) p.set('status', statusFilter)
      p.set('limit', '10000')
      const r = await fetch('/api/audit/export?' + p)
      if (!r.ok) throw new Error('Export failed')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ext = exportFmt === 'excel' ? 'xls' : exportFmt
      a.href = url; a.download = `cryptnest-audit-${Date.now()}.${ext}`; a.click()
      URL.revokeObjectURL(url)
      setExportModal(false)
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally { setExporting(false) }
  }

  if (status === 'loading') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f1117', color: '#e8ecf4' }}>Loading…</div>

  const fmtOptions = [
    { value: 'csv', label: 'CSV', desc: 'Spreadsheet compatible', icon: '📄' },
    { value: 'json', label: 'JSON', desc: 'Raw data format', icon: '{ }' },
    { value: 'excel', label: 'Excel', desc: 'Microsoft Excel (.xls)', icon: '📊' },
  ]

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Audit Logs" subtitle={
          isManager && department
            ? `${department.name} department only`
            : 'All activity across CryptNest'
        } onSearch={v => setSearch(v)}>

          {/* Department badge for manager */}
          {isManager && department && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e2435', border: '1px solid #2e3650', borderRadius: '20px', padding: '4px 12px 4px 8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: department.color || '#f4a829' }} />
              <span style={{ fontSize: '11px', color: '#8b93aa' }}>{department.name}</span>
            </div>
          )}

          {isAdmin && (
            <button className="btn-ghost" onClick={() => setExportModal(true)} style={{ fontSize: '11px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /></svg>
              Export
            </button>
          )}
          <button className="btn-ghost" onClick={fetchLogs} style={{ padding: '8px 10px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></svg>
          </button>
        </TopBar>

        {/* Manager info banner */}
        {isManager && (
          <div style={{ padding: '10px 20px', background: '#1e2e42', borderBottom: '1px solid #2e3650', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span style={{ fontSize: '12px', color: '#60a5fa' }}>
              You are viewing audit logs for <strong>{department?.name || 'your'}</strong> department only.
              {!department && ' No department assigned to your account — contact admin.'}
            </span>
          </div>
        )}

        {/* Filters */}
        <div style={{ padding: '10px 20px', background: '#181c27', borderBottom: '1px solid #2e3650', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          {[
            { value: actionFilter, set: setActionFilter, placeholder: 'All actions', options: ['upload','download','delete','share','login','logout','permission','rename','move'] },
            { value: statusFilter, set: setStatusFilter, placeholder: 'All severity', options: [{ v: 'suspicious', l: 'Critical' }, { v: 'failed', l: 'Warning' }, { v: 'success', l: 'Info' }] },
          ].map((f, i) => (
            <select key={i} value={f.value} onChange={e => f.set(e.target.value)} style={{ background: '#1e2435', border: '1px solid #2e3650', borderRadius: '6px', color: f.value ? '#e8ecf4' : '#8b93aa', fontSize: '11px', padding: '5px 8px', outline: 'none', fontFamily: 'inherit' }}>
              <option value="">{f.placeholder}</option>
              {f.options.map(o => typeof o === 'string'
                ? <option key={o} value={o}>{o}</option>
                : <option key={o.v} value={o.v}>{o.l}</option>
              )}
            </select>
          ))}
          {(search || actionFilter || statusFilter) && (
            <button onClick={() => { setSearch(''); setActionFilter(''); setStatusFilter('') }} style={{ background: 'none', border: 'none', color: '#f4a829', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Clear filters</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#555e78' }}>{logs.length} events shown</span>
        </div>

        <div className="page-content" style={{ display: 'flex', gap: '14px', padding: '16px 20px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '12px', marginBottom: '14px' }}>
              {[
                { label: isManager ? 'Dept critical alerts' : 'Critical alerts', value: stats.critical, dot: '#f05b5b', sub: 'Needs review' },
                { label: isManager ? 'Dept warnings' : 'Warnings', value: stats.warnings, dot: '#f4a829', sub: 'Logged' },
                { label: isManager ? 'Dept total events' : 'Total events', value: stats.total, dot: '#3c82f6', sub: isManager ? `${department?.name || 'Dept'} only` : 'All time' },
                { label: 'Showing', value: logs.length, dot: '#22c97e', sub: 'Filtered' },
              ].map((m, i) => (
                <div key={i} className="metric-card">
                  <div className="metric-label"><div className="metric-dot" style={{ background: m.dot }} />{m.label}</div>
                  <div className="metric-val">{m.value.toLocaleString()}</div>
                  <div className="metric-sub">{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Logs Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>{[['Timestamp','130px'],['User','120px'],['Action','100px'],['Severity','90px'],['Resource','auto'],['IP','110px']].map(([h,w]) => (
                    <th key={h} style={{ width: w, fontSize: '10px', color: '#555e78', letterSpacing: '.8px', textTransform: 'uppercase', fontWeight: 500, padding: '10px 10px', textAlign: 'left', borderBottom: '1px solid #2e3650', background: '#181c27' }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#555e78' }}>Loading logs…</td></tr>
                    : logs.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#555e78' }}>
                        {isManager && !department ? 'No department assigned to your account' : 'No logs found'}
                      </td></tr>
                    ) : logs.map(l => {
                      const as = ACTION_STYLES[l.action] || ACTION_STYLES.login
                      const ss = SEV_STYLES[l.status] || SEV_STYLES.success
                      const initials = l.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SY'
                      return (
                        <tr key={l._id} onClick={() => setSelected(selected?._id === l._id ? null : l)}
                          style={{ cursor: 'pointer', background: selected?._id === l._id ? '#1e2435' : 'transparent' }}
                          onMouseEnter={e => { if (selected?._id !== l._id) e.currentTarget.style.background = '#181c27' }}
                          onMouseLeave={e => { if (selected?._id !== l._id) e.currentTarget.style.background = 'transparent' }}>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #2e3650', fontSize: '10px', color: '#555e78', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleString()}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #2e3650' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#252c3e', color: '#f4a829', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#e8ecf4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.user?.name || 'System'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #2e3650' }}>
                            <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: as.bg, color: as.tc }}>{l.action}</span>
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #2e3650' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: ss.bg, color: ss.tc }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: ss.dot, display: 'inline-block' }} />{ss.label}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #2e3650', fontSize: '11px', color: '#8b93aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.resource}</td>
                          <td style={{ padding: '8px 10px', borderBottom: '1px solid #2e3650', fontSize: '10px', color: '#555e78', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.ipAddress}</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {selected && (
            <div style={{ width: '290px', flexShrink: 0 }}>
              <div className="card" style={{ position: 'sticky', top: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8ecf4' }}>Event detail</span>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#8b93aa', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
                </div>
                {[
                  { label: 'Action', value: selected.action },
                  { label: 'Severity', value: SEV_STYLES[selected.status]?.label || selected.status },
                  { label: 'User', value: selected.user?.name || 'System' },
                  { label: 'Email', value: selected.user?.email || '—' },
                  { label: 'Role', value: selected.user?.role || '—' },
                  { label: 'Resource', value: selected.resource || '—' },
                  { label: 'IP Address', value: selected.ipAddress || '—' },
                  { label: 'Time', value: new Date(selected.createdAt).toLocaleString() },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2e3650', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#8b93aa', flexShrink: 0 }}>{item.label}</span>
                    <span style={{ fontSize: '11px', color: '#e8ecf4', fontWeight: 600, textAlign: 'right', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: '8px' }}>{item.value}</span>
                  </div>
                ))}
                {selected.meta && Object.keys(selected.meta).length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#555e78', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Metadata</div>
                    <pre style={{ background: '#1e2435', borderRadius: '6px', padding: '10px', fontSize: '10px', color: '#8b93aa', overflow: 'auto', fontFamily: 'monospace', lineHeight: 1.6, maxHeight: '200px' }}>{JSON.stringify(selected.meta, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Export Modal — admin only */}
        {exportModal && isAdmin && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setExportModal(false)}>
            <div style={{ background: '#181c27', border: '1px solid #2e3650', borderRadius: '12px', padding: '24px', width: '360px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e8ecf4', marginBottom: '6px' }}>Export audit logs</h3>
              <p style={{ fontSize: '12px', color: '#8b93aa', marginBottom: '16px' }}>Exporting {logs.length} events with current filters.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '20px' }}>
                {fmtOptions.map(f => (
                  <button key={f.value} onClick={() => setExportFmt(f.value)} style={{ padding: '14px 8px', borderRadius: '8px', border: exportFmt === f.value ? '2px solid #f4a829' : '1px solid #2e3650', background: exportFmt === f.value ? '#2e2008' : '#1e2435', color: exportFmt === f.value ? '#f4a829' : '#8b93aa', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{f.icon}</div>
                    <div>{f.label}</div>
                    <div style={{ fontSize: '9px', fontWeight: 400, marginTop: '2px', color: exportFmt === f.value ? '#f4a829' : '#555e78' }}>{f.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setExportModal(false)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button onClick={handleExport} disabled={exporting} className="btn-amber" style={{ flex: 1, justifyContent: 'center' }}>
                  {exporting ? 'Exporting…' : 'Download'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
