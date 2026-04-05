import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import AuditLog from '@/models/AuditLog'
import User from '@/models/User'
import Department from '@/models/Department'

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Only superadmin, admin, manager can access audit logs
    if (!['superadmin', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || ''
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    const query = {}
    if (action) query.action = action
    if (status) query.status = status
    if (search) query.$or = [
      { resource: { $regex: search, $options: 'i' } },
      { ipAddress: { $regex: search, $options: 'i' } },
    ]

    // ✅ MANAGER — filter logs to their department only
    if (session.user.role === 'manager') {
      // Get the manager's own user record to find their department
      const managerUser = await User.findOne({ email: session.user.email }).select('department')

      if (!managerUser?.department) {
        // Manager has no department assigned — show empty
        return NextResponse.json({ logs: [], total: 0, critical: 0, warnings: 0, department: null })
      }

      // Find all users in the same department
      const deptUsers = await User.find({ department: managerUser.department }).select('_id')
      const deptUserIds = deptUsers.map(u => u._id)

      // Add department filter to query
      query.user = { $in: deptUserIds }

      // Get department name for display
      const dept = await Department.findById(managerUser.department).select('name color')

      const logs = await AuditLog.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(limit)

      const total = await AuditLog.countDocuments({ user: { $in: deptUserIds } })
      const critical = await AuditLog.countDocuments({ user: { $in: deptUserIds }, status: 'suspicious' })
      const warnings = await AuditLog.countDocuments({ user: { $in: deptUserIds }, status: 'failed' })

      return NextResponse.json({
        logs,
        total,
        critical,
        warnings,
        department: dept,
        isFiltered: true, // tells frontend this is department-filtered
      })
    }

    // ✅ SUPERADMIN / ADMIN — see all logs
    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit)

    const total = await AuditLog.countDocuments()
    const critical = await AuditLog.countDocuments({ status: 'suspicious' })
    const warnings = await AuditLog.countDocuments({ status: 'failed' })

    return NextResponse.json({ logs, total, critical, warnings, isFiltered: false })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
