import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptBuffer } from '@/lib/encryption'

const PREVIEWABLE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain', 'text/csv', 'application/json']

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('id')
    if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findById(fileId)
    if (!file || file.isDeleted) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    if (!PREVIEWABLE.includes(file.mimeType)) {
      return NextResponse.json({ error: 'File type not previewable', previewable: false }, { status: 415 })
    }

    const { data, error } = await supabaseAdmin.storage.from('cryptnest-files').download(file.supabasePath)
    if (error) throw new Error(error.message)

    const encBuf = Buffer.from(await data.arrayBuffer())
    const decBuf = decryptBuffer(encBuf)

    return new Response(decBuf, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
