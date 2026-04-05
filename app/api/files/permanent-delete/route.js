import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findById(id)
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    // Delete from Supabase if it has a path
    if (file.supabasePath) {
      await supabaseAdmin.storage.from('cryptnest-files').remove([file.supabasePath])
    }

    await File.findByIdAndDelete(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
