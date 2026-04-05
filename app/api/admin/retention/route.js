import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import AuditLog from '@/models/AuditLog'

// Default retention: 365 days
let retentionDays = 365

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['superadmin', 'admin'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await connectDB()
    const total = await AuditLog.countDocuments()
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    const expiring = await AuditLog.countDocuments({ createdAt: { $lt: cutoff } })

    return NextResponse.json({ retentionDays, total, expiring })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['superadmin', 'admin'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { days } = await req.json()
    if (!days || days < 7) return NextResponse.json({ error: 'Minimum 7 days retention' }, { status: 400 })

    retentionDays = parseInt(days)
    return NextResponse.json({ success: true, retentionDays })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['superadmin', 'admin'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await connectDB()
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } })

    return NextResponse.json({ success: true, deleted: result.deletedCount, retentionDays })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
