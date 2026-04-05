import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'
import Department from '@/models/Department'

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['superadmin', 'admin', 'manager'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await connectDB()

    // Monthly uploads for last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyUploads = await File.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          totalSize: { $sum: '$sizeBytes' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ])

    // Storage by department
    const deptStorage = await Department.find().select('name color usedGB quotaGB')

    // Action breakdown for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const actionBreakdown = await AuditLog.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Total files by type (top 6)
    const fileTypes = await File.aggregate([
      { $match: { isDeleted: false, isFolder: false } },
      {
        $addFields: {
          ext: {
            $toLower: {
              $arrayElemAt: [{ $split: ['$name', '.'] }, -1],
            },
          },
        },
      },
      { $group: { _id: '$ext', count: { $sum: 1 }, size: { $sum: '$sizeBytes' } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ])

    // Format monthly data filling in missing months
    const months = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const found = monthlyUploads.find(m => m._id.year === d.getFullYear() && m._id.month === d.getMonth() + 1)
      months.push({
        label: monthNames[d.getMonth()],
        count: found?.count || 0,
        size: found?.totalSize || 0,
      })
    }

    return NextResponse.json({
      monthlyUploads: months,
      deptStorage: deptStorage.map(d => ({
        name: d.name,
        color: d.color,
        usedGB: d.usedGB,
        quotaGB: d.quotaGB,
        pct: d.quotaGB > 0 ? Math.round((d.usedGB / d.quotaGB) * 100) : 0,
      })),
      actionBreakdown,
      fileTypes,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
