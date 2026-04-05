import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'
import Department from '@/models/Department'
import User from '@/models/User'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const FILE_COLORS = {
  pdf: { bg: '#1e3a5f', tc: '#60a5fa' },
  xlsx: { bg: '#1a2e1a', tc: '#4ade80' }, xls: { bg: '#1a2e1a', tc: '#4ade80' },
  docx: { bg: '#1a2e3a', tc: '#38bdf8' }, doc: { bg: '#1a2e3a', tc: '#38bdf8' },
  zip: { bg: '#2e1e0a', tc: '#fb923c' },
  pptx: { bg: '#2a1428', tc: '#f472b6' },
  png: { bg: '#1a2a1a', tc: '#4ade80' }, jpg: { bg: '#1a2a1a', tc: '#4ade80' },
  default: { bg: '#252c3e', tc: '#8b93aa' },
}

function getFileColor(name) {
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  return FILE_COLORS[ext] || FILE_COLORS.default
}

function getFileType(name) {
  return (name?.split('.').pop()?.toUpperCase() || 'FILE').slice(0, 3)
}

const ACTION_COLORS = {
  upload: { bg: '#1a2e1a', tc: '#4ade80' },
  download: { bg: '#1a2436', tc: '#60a5fa' },
  delete: { bg: '#2a0e0e', tc: '#f87171' },
  share: { bg: '#1a1a2e', tc: '#818cf8' },
  login: { bg: '#0e2a1a', tc: '#22c97e' },
  logout: { bg: '#252c3e', tc: '#8b93aa' },
  rename: { bg: '#2e2008', tc: '#f4a829' },
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  await connectDB()

  const isAdmin = ['superadmin', 'admin'].includes(session.user.role)
  const isManager = session.user.role === 'manager'

  // Files — show own files for members/viewers, all files for admins
  const fileQuery = isAdmin || isManager
    ? { isDeleted: false }
    : { isDeleted: false, uploadedBy: session.user.id }

  const [files, departments, userCount] = await Promise.all([
    File.find(fileQuery)
      .populate('uploadedBy', 'name')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(6),
    Department.find().sort({ name: 1 }),
    User.countDocuments({ isActive: true }),
  ])

  const totalFiles = await File.countDocuments(fileQuery)

  // ✅ Audit logs — ONLY for admin and above
  let logs = []
  let suspiciousCount = 0
  if (isAdmin) {
    logs = await AuditLog.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(8)
    suspiciousCount = await AuditLog.countDocuments({ status: 'suspicious' })
  }

  // ✅ Own activity — for members and viewers (their own actions only)
  let ownActivity = []
  if (!isAdmin) {
    ownActivity = await AuditLog.find({ user: session.user.id })
      .sort({ createdAt: -1 })
      .limit(6)
  }

  const totalStorageBytes = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0)

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">
        <TopBar title="Dashboard" subtitle={`Welcome back, ${session.user.name}`} />
        <div className="page-content">

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '12px', marginBottom: '16px' }} className="metrics-grid">
            {[
              { label: 'Total storage', value: formatBytes(totalStorageBytes), sub: 'Encrypted files', dot: '#f4a829' },
              { label: 'Active users', value: isAdmin ? userCount.toLocaleString() : '—', sub: isAdmin ? 'Across all depts' : 'Admin only', dot: '#3c82f6' },
              { label: isAdmin ? 'Total files' : 'My files', value: totalFiles.toLocaleString(), sub: 'Excluding deleted', dot: '#22c97e' },
              { label: 'Security alerts', value: isAdmin ? suspiciousCount.toString() : '—', sub: isAdmin ? (suspiciousCount > 0 ? 'Needs review' : 'All clear') : 'Admin only', dot: '#f05b5b' },
            ].map((m, i) => (
              <div key={i} className="metric-card">
                <div className="metric-label"><div className="metric-dot" style={{ background: m.dot }} />{m.label}</div>
                <div className="metric-val">{m.value}</div>
                <div className="metric-sub" style={i === 3 && isAdmin && suspiciousCount > 0 ? { color: '#f05b5b' } : {}}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 320px' : '1fr', gap: '14px', marginBottom: '14px' }} className="row2">

            {/* Recent Files */}
            <div className="card">
              <div className="card-hdr">
                <span className="card-title">{isAdmin ? 'Recent files' : 'My recent files'}</span>
                <a href="/files" style={{ fontSize: '11px', color: '#f4a829' }}>View all →</a>
              </div>
              {files.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#555e78', fontSize: '12px' }}>
                  No files yet. <a href="/files" style={{ color: '#f4a829' }}>Upload your first file!</a>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Name', 'Dept', 'Size', 'Modified'].map(h => (
                      <th key={h} style={{ fontSize: '10px', color: '#555e78', letterSpacing: '.8px', textTransform: 'uppercase', fontWeight: 500, padding: '0 8px 10px', textAlign: 'left' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {files.map(f => {
                      const clr = getFileColor(f.name)
                      return (
                        <tr key={f._id}>
                          <td style={{ padding: '8px', borderTop: '1px solid #2e3650' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: clr.bg, color: clr.tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, flexShrink: 0 }}>{getFileType(f.name)}</div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: '#e8ecf4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{f.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px', borderTop: '1px solid #2e3650', fontSize: '11px', color: '#8b93aa' }}>{f.department?.name || '—'}</td>
                          <td style={{ padding: '8px', borderTop: '1px solid #2e3650', fontSize: '11px', color: '#8b93aa', whiteSpace: 'nowrap' }}>{formatBytes(f.sizeBytes)}</td>
                          <td style={{ padding: '8px', borderTop: '1px solid #2e3650', fontSize: '11px', color: '#555e78', whiteSpace: 'nowrap' }}>{timeAgo(f.createdAt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ✅ Audit Activity — ADMIN ONLY */}
            {isAdmin && (
              <div className="card">
                <div className="card-hdr">
                  <span className="card-title">Audit activity</span>
                  <a href="/audit" style={{ fontSize: '11px', color: '#f4a829' }}>View logs →</a>
                </div>
                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#555e78', fontSize: '12px' }}>No activity yet.</div>
                ) : logs.map((l, i) => {
                  const clr = ACTION_COLORS[l.action] || ACTION_COLORS.login
                  const initials = l.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SY'
                  return (
                    <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 0', borderBottom: i < logs.length - 1 ? '1px solid #2e3650' : 'none' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: clr.bg, color: clr.tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '11px', color: '#e8ecf4', fontWeight: 600 }}>{l.user?.name || 'System'}</span>
                        <span style={{ fontSize: '11px', color: '#8b93aa' }}> {l.action} </span>
                        <div style={{ fontSize: '10px', color: '#555e78', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.resource}</div>
                      </div>
                      <span style={{ fontSize: '10px', color: '#555e78', whiteSpace: 'nowrap' }}>{timeAgo(l.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ✅ My Activity — MEMBER / VIEWER only (their own actions) */}
          {!isAdmin && ownActivity.length > 0 && (
            <div className="card" style={{ marginBottom: '14px' }}>
              <div className="card-hdr">
                <span className="card-title">My recent activity</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {ownActivity.map((l, i) => {
                  const clr = ACTION_COLORS[l.action] || ACTION_COLORS.login
                  return (
                    <div key={l._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: i < ownActivity.length - 1 ? '1px solid #2e3650' : 'none' }}>
                      <span style={{ background: clr.bg, color: clr.tc, fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, textTransform: 'capitalize', flexShrink: 0 }}>{l.action}</span>
                      <span style={{ fontSize: '11px', color: '#8b93aa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.resource || 'Authentication'}</span>
                      <span style={{ fontSize: '10px', color: '#555e78', whiteSpace: 'nowrap' }}>{timeAgo(l.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Department Storage — admin and manager only */}
          {(isAdmin || isManager) && departments.length > 0 && (
            <div className="card">
              <div className="card-hdr">
                <span className="card-title">Department storage</span>
                {isAdmin && <a href="/admin" style={{ fontSize: '11px', color: '#f4a829' }}>Manage →</a>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {departments.map(d => {
                  const pct = d.quotaGB > 0 ? Math.min(100, Math.round((d.usedGB / d.quotaGB) * 100)) : 0
                  const barColor = pct > 80 ? '#f05b5b' : pct > 60 ? '#f4a829' : d.color || '#3c82f6'
                  return (
                    <div key={d._id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e8ecf4' }}>{d.name}</span>
                        <span style={{ fontSize: '11px', color: '#8b93aa' }}>{d.usedGB.toFixed(1)} / {d.quotaGB} GB</span>
                      </div>
                      <div style={{ height: '5px', background: '#252c3e', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '3px', transition: '.3s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                        <span style={{ fontSize: '10px', color: '#555e78' }}>{pct}% used</span>
                        {pct > 80 && <span style={{ fontSize: '10px', color: '#f05b5b' }}>Near limit!</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
