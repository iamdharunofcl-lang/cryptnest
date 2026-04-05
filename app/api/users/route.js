import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { sendEmail, welcomeEmail } from '@/lib/email'

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['superadmin', 'admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''

    const query = {}
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
    if (role) query.role = role
    if (status === 'Active') query.isActive = true
    if (status === 'Inactive' || status === 'Suspended') query.isActive = false

    const users = await User.find(query).select('-password').populate('department', 'name color').sort({ createdAt: -1 }).limit(100)
    const total = await User.countDocuments(query)

    return NextResponse.json({ users, total })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['superadmin', 'admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await connectDB()
    const { name, email, password, role, department } = await req.json()
    if (!name || !email) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return NextResponse.json({ error: 'User already exists' }, { status: 400 })

    const tempPassword = password || 'CryptNest@2026'
    const hashed = await bcrypt.hash(tempPassword, 12)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: role || 'member',
      department: department || null,
    })

    // ✅ Send welcome email
    const emailContent = welcomeEmail({ userName: name, email: email.toLowerCase() })
    await sendEmail(emailContent)

    return NextResponse.json({ success: true, user: { id: user._id, name, email, role } })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['superadmin', 'admin'].includes(session.user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await connectDB()
    const { id, ...updates } = await req.json()
    if (updates.password) updates.password = await bcrypt.hash(updates.password, 12)
    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password')

    return NextResponse.json({ success: true, user })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
