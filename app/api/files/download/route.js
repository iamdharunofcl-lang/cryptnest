import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptBuffer } from '@/lib/encryption'

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('id')
    if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 })
    const fileDoc = await File.findById(fileId)
    if (!fileDoc || fileDoc.isDeleted) return NextResponse.json({ error: 'File not found' }, { status: 404 })
    const { data, error } = await supabaseAdmin.storage.from('cryptnest-files').download(fileDoc.supabasePath)
    if (error) throw new Error(error.message)
    const arrayBuffer = await data.arrayBuffer()
    const decrypted = decryptBuffer(Buffer.from(arrayBuffer))
    await AuditLog.create({ user: session.user.id, action: 'download', resource: fileDoc.name, resourceId: fileDoc._id, status: 'success' })
    return new NextResponse(decrypted, { headers: { 'Content-Type': fileDoc.mimeType || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${fileDoc.originalName}"` } })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
