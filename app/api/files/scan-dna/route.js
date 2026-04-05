import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'

const ZWJ  = '\u200D'
const ZWNJ = '\u200C'
const ZWS  = '\u200B'

// Decode zero-width binary string back to number
function decodeDNA(zwStr) {
  const bits = zwStr.split(ZWS).map(c => c === ZWJ ? '1' : '0')
  return parseInt(bits.join(''), 2)
}

// Extract DNA code from text content
function extractTextDNA(text) {
  const zwPattern = new RegExp(`[${ZWJ}${ZWNJ}](${ZWS}[${ZWJ}${ZWNJ}]){15}`, 'g')
  const matches = text.match(zwPattern)
  if (!matches || matches.length === 0) return null

  const codes = matches.map(m => decodeDNA(m))
  // Return the most frequently appearing code (majority vote)
  const freq = {}
  codes.forEach(c => freq[c] = (freq[c] || 0) + 1)
  return parseInt(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])
}

// Extract DNA from binary file (checks last 8 bytes)
function extractBinaryDNA(buffer) {
  if (buffer.length < 8) return null
  const tail = buffer.subarray(buffer.length - 8)
  const magic = tail.readUInt32BE(0)
  if (magic !== 0xDEADBEEF) return null
  return tail.readUInt32BE(4)
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['superadmin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
    }

    await connectDB()
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file) return NextResponse.json({ error: 'File required' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || ''

    // Try to extract DNA code
    let dnaCode = null

    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('csv')) {
      dnaCode = extractTextDNA(buffer.toString('utf8'))
    } else {
      dnaCode = extractBinaryDNA(buffer)
    }

    if (dnaCode === null) {
      return NextResponse.json({
        found: false,
        message: 'No DNA watermark found in this file. It may have been uploaded before DNA was enabled, or the watermark was stripped.',
      })
    }

    const dnaTag = `DNA-${String(dnaCode).padStart(5, '0')}`

    // Search all files for matching DNA record
    const matchedFile = await File.findOne({ 'dnaRecords.dnaCode': dnaCode })
      .select('name dnaRecords')

    if (!matchedFile) {
      return NextResponse.json({
        found: true,
        dnaTag,
        dnaCode,
        matched: false,
        message: `DNA tag ${dnaTag} found but no matching download record. The file may have been deleted.`,
      })
    }

    const record = matchedFile.dnaRecords.find(r => r.dnaCode === dnaCode)

    return NextResponse.json({
      found: true,
      matched: true,
      dnaTag,
      dnaCode,
      file: matchedFile.name,
      leakedBy: {
        name: record.userName,
        email: record.userEmail,
        userId: record.userId,
        downloadedAt: record.downloadedAt,
        ip: record.ip,
      },
      message: `Leak traced! This file was downloaded by ${record.userName} on ${new Date(record.downloadedAt).toLocaleString()} from IP ${record.ip}`,
    })
  } catch (err) {
    console.error('[DNA Scan] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
