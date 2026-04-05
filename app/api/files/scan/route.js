import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptBuffer } from '@/lib/encryption'
import crypto from 'crypto'

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!VT_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'VirusTotal API key not configured. Add VIRUSTOTAL_API_KEY to .env.local',
        hint: 'Get a free API key at virustotal.com (500 requests/day)',
      }, { status: 503 })
    }

    await connectDB()
    const { fileId } = await req.json()
    if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findById(fileId)
    if (!file || file.isDeleted) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    // Download and decrypt file
    const { data, error } = await supabaseAdmin.storage.from('cryptnest-files').download(file.supabasePath)
    if (error) throw new Error(error.message)

    const encBuf = Buffer.from(await data.arrayBuffer())
    const decBuf = decryptBuffer(encBuf)

    // Calculate SHA-256 hash
    const hash = crypto.createHash('sha256').update(decBuf).digest('hex')

    // Check hash against VirusTotal (no upload needed - just hash lookup)
    const vtRes = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
      headers: { 'x-apikey': VT_API_KEY },
    })

    if (vtRes.status === 404) {
      // File not known to VirusTotal — upload for scanning
      const formData = new FormData()
      formData.append('file', new Blob([decBuf]), file.name)

      const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
        method: 'POST',
        headers: { 'x-apikey': VT_API_KEY },
        body: formData,
      })

      if (!uploadRes.ok) throw new Error('VirusTotal upload failed')

      return NextResponse.json({
        success: true,
        status: 'submitted',
        message: 'File submitted to VirusTotal for scanning. Check back in a few minutes.',
        hash,
      })
    }

    if (!vtRes.ok) throw new Error('VirusTotal API error: ' + vtRes.status)

    const vtData = await vtRes.json()
    const stats = vtData.data?.attributes?.last_analysis_stats || {}
    const malicious = stats.malicious || 0
    const suspicious = stats.suspicious || 0
    const clean = malicious === 0 && suspicious === 0

    // Log scan result
    await AuditLog.create({
      user: session.user.id,
      action: 'download',
      resource: `Virus scan: ${file.name}`,
      resourceId: file._id,
      status: clean ? 'success' : 'suspicious',
      meta: { hash, malicious, suspicious, undetected: stats.undetected, scanDate: new Date() },
    })

    return NextResponse.json({
      success: true,
      clean,
      hash,
      stats,
      malicious,
      suspicious,
      total: (stats.malicious || 0) + (stats.suspicious || 0) + (stats.undetected || 0) + (stats.harmless || 0),
      message: clean ? '✓ No threats detected' : `⚠️ ${malicious} engines flagged this file as malicious`,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
