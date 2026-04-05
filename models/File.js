import mongoose from 'mongoose'

const DNARecordSchema = new mongoose.Schema({
  dnaTag: String,
  dnaCode: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  userEmail: String,
  downloadedAt: { type: Date, default: Date.now },
  ip: String,
}, { _id: false })

const FileSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  originalName: { type: String, required: true },
  supabasePath: { type: String, required: true },
  mimeType: { type: String, default: 'application/octet-stream' },
  sizeBytes: { type: Number, default: 0 },
  encrypted: { type: Boolean, default: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  parentFolder: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null },
  isFolder: { type: Boolean, default: false },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [{ type: String }],
  starred: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  // ✅ File DNA records
  dnaEnabled: { type: Boolean, default: true },
  dnaRecords: [DNARecordSchema],
  // ✅ Chain of custody
  custodyChainHash: { type: String, default: null },
  custodyVerified: { type: Boolean, default: true },
}, { timestamps: true })

FileSchema.index({ name: 'text' })
FileSchema.index({ uploadedBy: 1, isDeleted: 1 })
FileSchema.index({ department: 1, isDeleted: 1 })
FileSchema.index({ starred: 1, uploadedBy: 1 })
FileSchema.index({ 'dnaRecords.dnaCode': 1 })

export default mongoose.models.File || mongoose.model('File', FileSchema)
