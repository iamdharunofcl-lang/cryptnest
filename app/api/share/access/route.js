import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/mongodb'
import ShareLink from '@/models/ShareLink'
import File from '@/models/File'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptBuffer } from '@/lib/encryption'

export async function GET(req) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const action = searchParams.get('action') // 'info' or 'download'

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const link = await ShareLink.findOne({ token }).populate('file')
    if (!link || !link.isActive) return NextResponse.json({ error: 'Invalid or revoked link' }, { status: 404 })

    // Check expiry
    if (link.expiresAt && new Date() > link.expiresAt) {
      await ShareLink.findByIdAndUpdate(link._id, { isActive: false })
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 })
    }

    // Return file info (no auth needed for info)
    if (action !== 'download') {
      await ShareLink.findByIdAndUpdate(link._id, { $inc: { accessCount: 1 } })
      return NextResponse.json({
        success: true,
        file: {
          name: link.file.name,
          mimeType: link.file.mimeType,
          sizeBytes: link.file.sizeBytes,
        },
        permission: link.permission,
        accessCount: link.accessCount + 1,
        hasPassword: !!link.password,
      })
    }

    return NextResponse.json({ error: 'Use POST to download' }, { status: 405 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const link = await ShareLink.findOne({ token }).populate('file')
    if (!link || !link.isActive) return NextResponse.json({ error: 'Invalid or revoked link' }, { status: 404 })

    if (link.expiresAt && new Date() > link.expiresAt) {
      await ShareLink.findByIdAndUpdate(link._id, { isActive: false })
      return NextResponse.json({ error: 'Link has expired' }, { status: 410 })
    }

    // ✅ PASSWORD CHECK
    if (link.password) {
      let body = {}
      try { body = await req.json() } catch (_) {}
      const { password } = body
      if (!password) return NextResponse.json({ error: 'Password required', needsPassword: true }, { status: 401 })

      const valid = await bcrypt.compare(password, link.password)
      if (!valid) return NextResponse.json({ error: 'Incorrect password', needsPassword: true }, { status: 403 })
    }

    // ✅ PERMISSION CHECK
    if (link.permission === 'view') {
      return NextResponse.json({ error: 'Download not allowed with view permission' }, { status: 403 })
    }

    const file = link.file
    const { data, error } = await supabaseAdmin.storage.from('cryptnest-files').download(file.supabasePath)
    if (error) throw new Error(error.message)

    const encBuf = Buffer.from(await data.arrayBuffer())
    const decBuf = decryptBuffer(encBuf)

    await ShareLink.findByIdAndUpdate(link._id, { $inc: { accessCount: 1 } })

    return new Response(decBuf, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.originalName || file.name}"`,
        'Content-Length': decBuf.length.toString(),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
