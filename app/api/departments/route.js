import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Department from '@/models/Department'

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await connectDB()
    const departments = await Department.find({}).sort({ name: 1 })
    return NextResponse.json({ departments })
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
    const { id, quotaGB } = await req.json()
    await Department.findByIdAndUpdate(id, { quotaGB })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
