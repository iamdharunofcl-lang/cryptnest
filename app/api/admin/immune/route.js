import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import AuditLog from '@/models/AuditLog'
import User from '@/models/User'

// Analyse a user's behaviour baseline from last 7 days
async function buildBaseline(userId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const logs = await AuditLog.find({
    user: userId,
    createdAt: { $gte: sevenDaysAgo },
    status: 'success',
  }).select('action ipAddress createdAt')

  if (logs.length < 3) return null // not enough data yet

  // Extract patterns
  const hours = logs.map(l => new Date(l.createdAt).getHours())
  const ips = [...new Set(logs.map(l => l.ipAddress).filter(Boolean))]
  const downloadCount = logs.filter(l => l.action === 'download').length
  const avgDownloadsPerDay = downloadCount / 7

  const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length)
  const minHour = Math.min(...hours)
  const maxHour = Math.max(...hours)

  return { avgHour, minHour, maxHour, knownIPs: ips, avgDownloadsPerDay, totalLogs: logs.length }
}

// Score how anomalous recent activity is
async function scoreAnomaly(userId, baseline) {
  if (!baseline) return { score: 0, reasons: [], hasEnoughData: false }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentLogs = await AuditLog.find({
    user: userId,
    createdAt: { $gte: oneHourAgo },
  }).select('action ipAddress createdAt status')

  if (recentLogs.length === 0) return { score: 0, reasons: [], hasEnoughData: true }

  const reasons = []
  let score = 0

  // Check 1: Login time anomaly
  const recentHours = recentLogs.map(l => new Date(l.createdAt).getHours())
  const currentHour = new Date().getHours()
  if (currentHour < baseline.minHour - 2 || currentHour > baseline.maxHour + 2) {
    score += 25
    reasons.push({ signal: 'Unusual login time', detail: `Activity at ${currentHour}:00 — normal range is ${baseline.minHour}:00-${baseline.maxHour}:00`, weight: 25 })
  }

  // Check 2: New IP address
  const recentIPs = [...new Set(recentLogs.map(l => l.ipAddress).filter(Boolean))]
  const newIPs = recentIPs.filter(ip => !baseline.knownIPs.includes(ip) && ip !== 'unknown')
  if (newIPs.length > 0) {
    score += 30
    reasons.push({ signal: 'New IP address detected', detail: `Login from ${newIPs.join(', ')} — never seen before`, weight: 30 })
  }

  // Check 3: Bulk downloads
  const recentDownloads = recentLogs.filter(l => l.action === 'download').length
  const expectedPerHour = baseline.avgDownloadsPerDay / 8
  if (recentDownloads > expectedPerHour * 10 && recentDownloads > 10) {
    score += 35
    reasons.push({ signal: 'Abnormal download volume', detail: `${recentDownloads} downloads in 1 hour — normal is ${Math.round(expectedPerHour)}/hour`, weight: 35 })
  }

  // Check 4: Multiple failed logins before success
  const recentFailed = recentLogs.filter(l => l.status === 'failed' && l.action === 'login').length
  if (recentFailed >= 3) {
    score += 20
    reasons.push({ signal: 'Multiple failed logins', detail: `${recentFailed} failed login attempts detected`, weight: 20 })
  }

  // Check 5: Suspicious status logs
  const suspiciousLogs = recentLogs.filter(l => l.status === 'suspicious').length
  if (suspiciousLogs > 0) {
    score += 15
    reasons.push({ signal: 'Suspicious activity flagged', detail: `${suspiciousLogs} actions already flagged as suspicious`, weight: 15 })
  }

  return { score: Math.min(score, 100), reasons, hasEnoughData: true }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['superadmin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    // If userId provided — return single user analysis
    if (userId) {
      const user = await User.findById(userId).select('name email role department isActive')
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      const baseline = await buildBaseline(userId)
      const anomaly = await scoreAnomaly(userId, baseline)

      return NextResponse.json({ user, baseline, anomaly })
    }

    // Otherwise return all active users with risk scores
    const users = await User.find({ isActive: true, role: { $ne: 'viewer' } })
      .select('name email role department')
      .limit(50)

    const results = await Promise.all(users.map(async u => {
      const baseline = await buildBaseline(u._id)
      const anomaly = await scoreAnomaly(u._id, baseline)
      return {
        user: { id: u._id, name: u.name, email: u.email, role: u.role },
        riskScore: anomaly.score,
        hasEnoughData: anomaly.hasEnoughData,
        topReason: anomaly.reasons[0] || null,
        threatLevel: anomaly.score >= 70 ? 'critical' : anomaly.score >= 40 ? 'warning' : 'safe',
      }
    }))

    // Sort by risk score descending
    results.sort((a, b) => b.riskScore - a.riskScore)

    const critical = results.filter(r => r.threatLevel === 'critical').length
    const warnings = results.filter(r => r.threatLevel === 'warning').length

    return NextResponse.json({ users: results, critical, warnings, total: results.length })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Auto-lock a user flagged by immune system
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['superadmin', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()
    const { userId, action } = await req.json()

    if (action === 'lock') {
      await User.findByIdAndUpdate(userId, { isActive: false })
      await AuditLog.create({
        user: session.user.id,
        action: 'permission',
        resource: `Immune system auto-lock`,
        status: 'suspicious',
        meta: { lockedUserId: userId, reason: 'Immune system threshold exceeded' },
      })
      return NextResponse.json({ success: true, action: 'locked' })
    }

    if (action === 'unlock') {
      await User.findByIdAndUpdate(userId, { isActive: true })
      return NextResponse.json({ success: true, action: 'unlocked' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
