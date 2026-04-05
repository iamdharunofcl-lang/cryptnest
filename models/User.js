import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'manager', 'member', 'viewer'], default: 'member' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  avatar: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
}, { timestamps: true })

export default mongoose.models.User || mongoose.model('User', UserSchema)
