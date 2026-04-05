import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

// Simple in-memory store (shared via module cache)
const resetTokens = new Map()

export async function POST(req) {
  try {
    await connectDB()
    const { token, password } = await req.json()

    if (!token || !password) return NextResponse.json({ error: 'Token and password required' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const record = resetTokens.get(token)
    if (!record) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    if (Date.now() > record.expires) {
      resetTokens.delete(token)
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)
    await User.findByIdAndUpdate(record.userId, { password: hashed })
    resetTokens.delete(token)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false })

  const record = resetTokens.get(token)
  if (!record || Date.now() > record.expires) return NextResponse.json({ valid: false })

  return NextResponse.json({ valid: true, email: record.email })
}
