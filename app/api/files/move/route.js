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
    const { id, parentFolder, department } = await req.json()
    if (!id) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findById(id)
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const updates = {}
    if (parentFolder !== undefined) updates.parentFolder = parentFolder || null
    if (department !== undefined) updates.department = department || null

    await File.findByIdAndUpdate(id, updates)

    await AuditLog.create({
      user: session.user.id,
      action: 'move',
      resource: file.name,
      resourceId: file._id,
      status: 'success',
      meta: { parentFolder, department },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
