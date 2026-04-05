import mongoose from 'mongoose'

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#f4a829' },
  quotaGB: { type: Number, default: 100 },
  usedGB: { type: Number, default: 0 },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

export default mongoose.models.Department || mongoose.model('Department', DepartmentSchema)
