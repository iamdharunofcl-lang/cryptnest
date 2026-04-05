import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findById(id)
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const updated = await File.findByIdAndUpdate(id, { starred: !file.starred }, { new: true })
    return NextResponse.json({ success: true, starred: updated.starred })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
