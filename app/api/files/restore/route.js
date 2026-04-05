import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findByIdAndUpdate(id, { isDeleted: false, deletedAt: null }, { new: true })
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    await AuditLog.create({
      user: session.user.id,
      action: 'move',
      resource: file.name,
      resourceId: file._id,
      status: 'success',
      meta: { action: 'restored_from_recycle_bin' },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
