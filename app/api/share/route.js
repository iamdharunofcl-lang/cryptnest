import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import ShareLink from '@/models/ShareLink'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { fileId, permission, expiresAt, password } = await req.json()
    if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findById(fileId)
    if (!file || file.isDeleted) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const validPerms = ['view', 'download', 'edit']
    const perm = validPerms.includes(permission) ? permission : 'view'

    // Hash password if provided
    let hashedPassword = null
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password.trim(), 10)
    }

    const token = crypto.randomBytes(32).toString('hex')
    await ShareLink.create({
      file: fileId,
      createdBy: session.user.id,
      token,
      permission: perm,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      password: hashedPassword,
    })

    await AuditLog.create({
      user: session.user.id,
      action: 'share',
      resource: file.name,
      resourceId: file._id,
      status: 'success',
      meta: { permission: perm, hasPassword: !!hashedPassword, expiresAt },
    })

    const shareUrl = `${process.env.NEXTAUTH_URL}/share/${token}`
    return NextResponse.json({ success: true, shareUrl, token, permission: perm })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const links = await ShareLink.find({ createdBy: session.user.id })
      .populate('file', 'name mimeType sizeBytes')
      .sort({ createdAt: -1 })
      .limit(50)

    return NextResponse.json({ links })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
