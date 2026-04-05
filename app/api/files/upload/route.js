import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import Department from '@/models/Department'
import AuditLog from '@/models/AuditLog'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptBuffer } from '@/lib/encryption'

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const formData = await req.formData()
    const file = formData.get('file')
    const departmentId = formData.get('departmentId') || null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // ✅ QUOTA ENFORCEMENT
    if (departmentId) {
      const dept = await Department.findById(departmentId)
      if (dept) {
        const fileSizeGB = file.size / (1024 * 1024 * 1024)
        const projectedUsage = dept.usedGB + fileSizeGB
        if (projectedUsage > dept.quotaGB) {
          await AuditLog.create({
            user: session.user.id,
            action: 'upload',
            resource: file.name,
            status: 'failed',
            meta: {
              reason: 'Quota exceeded',
              deptQuotaGB: dept.quotaGB,
              deptUsedGB: dept.usedGB,
              fileSizeGB: fileSizeGB.toFixed(4),
            },
          })
          return NextResponse.json({
            error: `Storage quota exceeded for ${dept.name}. Used: ${dept.usedGB.toFixed(2)}GB / ${dept.quotaGB}GB. Free up space or ask your admin to increase the quota.`,
            quotaExceeded: true,
          }, { status: 413 })
        }
      }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const encryptedBuffer = encryptBuffer(buffer)

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const deptPath = departmentId || 'general'
    const path = `${deptPath}/${session.user.id}/${timestamp}_${safeName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('cryptnest-files')
      .upload(path, encryptedBuffer, { contentType: 'application/octet-stream', upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    const fileDoc = await File.create({
      name: file.name,
      originalName: file.name,
      supabasePath: path,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      encrypted: true,
      department: departmentId || null,
      uploadedBy: session.user.id,
    })

    if (departmentId) {
      const sizeGB = file.size / (1024 * 1024 * 1024)
      await Department.findByIdAndUpdate(departmentId, { $inc: { usedGB: sizeGB } })
    }

    await AuditLog.create({
      user: session.user.id,
      action: 'upload',
      resource: file.name,
      resourceId: fileDoc._id,
      status: 'success',
      meta: { sizeBytes: file.size, mimeType: file.type, path },
    })

    return NextResponse.json({ success: true, file: { id: fileDoc._id, name: fileDoc.name, sizeBytes: fileDoc.sizeBytes, mimeType: fileDoc.mimeType, createdAt: fileDoc.createdAt } })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
