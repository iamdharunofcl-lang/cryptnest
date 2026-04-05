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
    const { id, name } = await req.json()
    if (!id || !name) return NextResponse.json({ error: 'File ID and name required' }, { status: 400 })

    const file = await File.findById(id)
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const oldName = file.name
    await File.findByIdAndUpdate(id, { name: name.trim() })

    await AuditLog.create({
      user: session.user.id,
      action: 'rename',
      resource: oldName,
      resourceId: file._id,
      status: 'success',
      meta: { oldName, newName: name.trim() },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
