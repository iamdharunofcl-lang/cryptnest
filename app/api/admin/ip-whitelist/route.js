import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'

// In-memory IP whitelist (persist to DB in production)
let whitelist = []
let enabled = false

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['superadmin', 'admin'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({ whitelist, enabled })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['superadmin', 'admin'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { ip, label } = await req.json()
    if (!ip) return NextResponse.json({ error: 'IP required' }, { status: 400 })

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$|^[\w:]+$/
    if (!ipRegex.test(ip)) return NextResponse.json({ error: 'Invalid IP format' }, { status: 400 })

    if (whitelist.find(w => w.ip === ip)) return NextResponse.json({ error: 'IP already whitelisted' }, { status: 400 })

    whitelist.push({ ip, label: label || ip, addedAt: new Date().toISOString() })
    return NextResponse.json({ success: true, whitelist })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['superadmin', 'admin'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const ip = searchParams.get('ip')
    whitelist = whitelist.filter(w => w.ip !== ip)
    return NextResponse.json({ success: true, whitelist })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['superadmin', 'admin'].includes(session.user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { enable } = await req.json()
    enabled = !!enable
    return NextResponse.json({ success: true, enabled })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
