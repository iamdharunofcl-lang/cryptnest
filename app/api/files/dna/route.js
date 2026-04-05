import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptBuffer } from '@/lib/encryption'

// Zero-width Unicode characters used as binary encoding
const ZWJ  = '\u200D' // zero-width joiner     = 1
const ZWNJ = '\u200C' // zero-width non-joiner = 0
const ZWS  = '\u200B' // zero-width space      = separator

// Encode a number as binary zero-width string
function encodeDNA(num) {
  const binary = num.toString(2).padStart(16, '0')
  return binary.split('').map(b => b === '1' ? ZWJ : ZWNJ).join(ZWS)
}

// Inject DNA into text content (PDF/DOCX text layer)
function injectTextDNA(text, dnaCode) {
  const words = text.split(' ')
  if (words.length < 4) return text

  const dnaStr = encodeDNA(dnaCode)
  // Inject after words at positions 3, 7, 12, 19 (or whatever exists)
  const positions = [3, 7, 12, 19].filter(p => p < words.length)

  positions.forEach(pos => {
    words[pos] = words[pos] + dnaStr
  })

  return words.join(' ')
}

// Inject DNA into binary files via metadata bytes
function injectBinaryDNA(buffer, dnaCode) {
  // Append DNA signature to end of file before last 4 bytes
  const dnaBuffer = Buffer.alloc(8)
  dnaBuffer.writeUInt32BE(0xDEADBEEF, 0) // magic marker
  dnaBuffer.writeUInt32BE(dnaCode, 4)     // the actual DNA code
  return Buffer.concat([buffer, dnaBuffer])
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { fileId } = await req.json()
    if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findById(fileId)
    if (!file || file.isDeleted) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    // Generate unique DNA code for this user+file+timestamp combo
    const dnaCode = Math.abs(
      (session.user.id.charCodeAt(0) * 1000 +
       Date.now() % 9999) % 65535
    )
    const dnaTag = `DNA-${String(dnaCode).padStart(5, '0')}`

    // Download encrypted file from Supabase
    const { data, error } = await supabaseAdmin.storage
      .from('cryptnest-files')
      .download(file.supabasePath)

    if (error) throw new Error(error.message)

    const encBuf = Buffer.from(await data.arrayBuffer())
    const decBuf = decryptBuffer(encBuf)

    // Inject DNA based on file type
    let watermarkedBuf
    const mimeType = file.mimeType || ''

    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('csv')) {
      // Text files — inject zero-width chars into content
      const text = decBuf.toString('utf8')
      const watermarked = injectTextDNA(text, dnaCode)
      watermarkedBuf = Buffer.from(watermarked, 'utf8')
    } else {
      // Binary files (PDF, DOCX, images) — inject into binary
      watermarkedBuf = injectBinaryDNA(decBuf, dnaCode)
    }

    // Log the DNA embedding in audit trail
    await AuditLog.create({
      user: session.user.id,
      action: 'download',
      resource: file.name,
      resourceId: file._id,
      status: 'success',
      meta: {
        dnaTag,
        dnaCode,
        watermarked: true,
        mimeType,
      },
    })

    // Store DNA record on file
    await File.findByIdAndUpdate(fileId, {
      $push: {
        dnaRecords: {
          dnaTag,
          dnaCode,
          userId: session.user.id,
          userName: session.user.name,
          userEmail: session.user.email,
          downloadedAt: new Date(),
          ip: req.headers.get('x-forwarded-for') || 'unknown',
        },
      },
    })

    return new Response(watermarkedBuf, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.originalName || file.name}"`,
        'Content-Length': watermarkedBuf.length.toString(),
        'X-DNA-Tag': dnaTag,
      },
    })
  } catch (err) {
    console.error('[DNA] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
