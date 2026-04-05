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
    const deletedFiles = await File.find({ isDeleted: true, uploadedBy: session.user.id })

    // Delete all from Supabase
    const paths = deletedFiles.filter(f => f.supabasePath).map(f => f.supabasePath)
    if (paths.length > 0) {
      await supabaseAdmin.storage.from('cryptnest-files').remove(paths)
    }

    const result = await File.deleteMany({ isDeleted: true, uploadedBy: session.user.id })
    return NextResponse.json({ success: true, count: result.deletedCount })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
