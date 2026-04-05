import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { authOptions } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import File from '@/models/File'
import AuditLog from '@/models/AuditLog'

// Generate SHA-256 hash of block data
function hashBlock(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

// Build chain from audit logs
async function buildChain(fileId) {
  const logs = await AuditLog.find({ resourceId: fileId })
    .populate('user', 'name email role')
    .sort({ createdAt: 1 }) // oldest first

  const chain = []
  let prevHash = '0'.repeat(64) // genesis hash

  for (const log of logs) {
    const blockData = {
      index: chain.length,
      action: log.action,
      status: log.status,
      resource: log.resource,
      user: log.user?.name || 'System',
      email: log.user?.email || '',
      ip: log.ipAddress || 'unknown',
      timestamp: log.createdAt,
      prevHash,
    }

    const blockHash = hashBlock(blockData)
    chain.push({ ...blockData, blockHash })
    prevHash = blockHash
  }

  return chain
}

// Verify chain integrity
function verifyChain(chain) {
  if (chain.length === 0) return { valid: true, tamperedAt: null }

  for (let i = 0; i < chain.length; i++) {
    const block = chain[i]
    const { blockHash, ...blockData } = block
    const expectedHash = hashBlock(blockData)

    if (blockHash !== expectedHash) {
      return { valid: false, tamperedAt: i, block }
    }

    if (i > 0 && block.prevHash !== chain[i - 1].blockHash) {
      return { valid: false, tamperedAt: i, block }
    }
  }

  return { valid: true, tamperedAt: null }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')
    if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 })

    const file = await File.findById(fileId).select('name originalName createdAt uploadedBy')
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const chain = await buildChain(fileId)
    const verification = verifyChain(chain)

    // Compute overall file hash (based on chain)
    const chainHash = chain.length > 0 ? chain[chain.length - 1].blockHash : '0'.repeat(64)

    return NextResponse.json({
      file: {
        id: fileId,
        name: file.name,
        originalName: file.originalName,
        createdAt: file.createdAt,
      },
      chain,
      verification,
      chainHash,
      totalBlocks: chain.length,
      generatedAt: new Date(),
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
