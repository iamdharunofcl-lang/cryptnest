import mongoose from 'mongoose'

const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: {
    type: String,
    enum: ['upload', 'download', 'delete', 'share', 'login', 'logout', 'rename', 'move', 'permission'],
    required: true,
  },
  resource: { type: String, default: '' },
  resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  ipAddress: { type: String, default: 'unknown' },
  userAgent: { type: String, default: 'unknown' },
  status: { type: String, enum: ['success', 'failed', 'suspicious'], default: 'success' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

AuditLogSchema.index({ createdAt: -1 })
AuditLogSchema.index({ user: 1 })
AuditLogSchema.index({ action: 1 })
AuditLogSchema.index({ status: 1 })

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema)
