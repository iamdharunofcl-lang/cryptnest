import mongoose from 'mongoose'

const ShareLinkSchema = new mongoose.Schema({
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  permission: { type: String, enum: ['view', 'download', 'edit'], default: 'view' },
  password: { type: String, default: null },
  expiresAt: { type: Date, default: null },
  accessCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

export default mongoose.models.ShareLink || mongoose.model('ShareLink', ShareLinkSchema)
