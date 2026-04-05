import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { name, parentFolder, department } = await req.json()
    if (!name) return NextResponse.json({ error: 'Folder name required' }, { status: 400 })

    const folder = await File.create({
      name: name.trim(),
      originalName: name.trim(),
      supabasePath: '',
      isFolder: true,
      encrypted: false,
      department: department || null,
      parentFolder: parentFolder || null,
      uploadedBy: session.user.id,
      sizeBytes: 0,
    })

    return NextResponse.json({ success: true, folder })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
