import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const department = searchParams.get('department')
    const search = searchParams.get('search')
    const folder = searchParams.get('folder')
    const deleted = searchParams.get('deleted') === 'true'
    const starred = searchParams.get('starred') === 'true'
    const sort = searchParams.get('sort') || 'date'

    const query = { isDeleted: deleted }

    if (starred) {
      query.starred = true
      query.uploadedBy = session.user.id
    } else if (!deleted) {
      query.parentFolder = folder ? folder : null
    }

    if (department) query.department = department
    if (search) query.name = { $regex: search, $options: 'i' }
    if (deleted) query.uploadedBy = session.user.id

    let sortObj = { createdAt: -1 }
    if (sort === 'name') sortObj = { name: 1 }
    if (sort === 'size') sortObj = { sizeBytes: -1 }
    if (sort === 'type') sortObj = { mimeType: 1 }

    const files = await File.find(query)
      .populate('uploadedBy', 'name email')
      .populate('department', 'name color')
      .sort({ isFolder: -1, ...sortObj })
      .limit(200)

    return NextResponse.json({ files })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
