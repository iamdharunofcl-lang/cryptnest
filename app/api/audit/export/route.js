import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import AuditLog from '@/models/AuditLog'
import User from '@/models/User'

function toCSV(logs) {
  const headers = ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Status', 'Resource', 'IP Address', 'User Agent']
  const rows = logs.map(l => [
    new Date(l.createdAt).toISOString(),
    l.user?.name || 'System',
    l.user?.email || '',
    l.user?.role || '',
    l.action,
    l.status,
    l.resource || '',
    l.ipAddress || '',
    l.userAgent || '',
  ])
  return [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
}

function toJSON(logs) {
  return JSON.stringify(logs.map(l => ({
    id: l._id,
    timestamp: l.createdAt,
    user: { name: l.user?.name || 'System', email: l.user?.email || '', role: l.user?.role || '' },
    action: l.action,
    status: l.status,
    resource: l.resource,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    meta: l.meta,
  })), null, 2)
}

function toExcelXML(logs) {
  const headers = ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Status', 'Resource', 'IP Address']
  const rows = logs.map(l => [
    new Date(l.createdAt).toLocaleString(),
    l.user?.name || 'System',
    l.user?.email || '',
    l.user?.role || '',
    l.action,
    l.status,
    l.resource || '',
    l.ipAddress || '',
  ])

  const xml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="CryptNest Audit Logs">
  <Table>
   <Row>${headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('')}</Row>
   ${rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${String(c).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Data></Cell>`).join('')}</Row>`).join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`
  return xml
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Allow admin and manager
    if (!['superadmin', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'csv'
    const action = searchParams.get('action') || ''
    const status = searchParams.get('status') || ''
    const limit = parseInt(searchParams.get('limit') || '10000')

    const query = {}
    if (action) query.action = action
    if (status) query.status = status

    // ✅ Manager: filter export to their department only
    if (session.user.role === 'manager') {
      const managerUser = await User.findOne({ email: session.user.email }).select('department')
      if (!managerUser?.department) {
        return new Response('No logs found for your department', { headers: { 'Content-Type': 'text/plain' } })
      }
      const deptUsers = await User.find({ department: managerUser.department }).select('_id')
      query.user = { $in: deptUsers.map(u => u._id) }
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit)

    const filename = `cryptnest-audit-${session.user.role === 'manager' ? 'dept-' : ''}${Date.now()}`

    if (format === 'json') {
      return new Response(toJSON(logs), {
        headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${filename}.json"` },
      })
    }

    if (format === 'excel') {
      return new Response(toExcelXML(logs), {
        headers: { 'Content-Type': 'application/vnd.ms-excel', 'Content-Disposition': `attachment; filename="${filename}.xls"` },
      })
    }

    return new Response(toCSV(logs), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${filename}.csv"` },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
