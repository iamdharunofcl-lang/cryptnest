import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('id')
    const fileDoc = await File.findById(fileId)
    if (!fileDoc) return NextResponse.json({ error: 'File not found' }, { status: 404 })
    await File.findByIdAndUpdate(fileId, { isDeleted: true, deletedAt: new Date() })
    await AuditLog.create({ user: session.user.id, action: 'delete', resource: fileDoc.name, resourceId: fileDoc._id, status: 'success' })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
