const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Run: node --env-file=.env.local scripts/seed.cjs')
  process.exit(1)
}

const DeptSchema = new mongoose.Schema({ name: String, description: String, color: String, quotaGB: { type: Number, default: 100 }, usedGB: { type: Number, default: 0 }, members: [mongoose.Schema.Types.ObjectId] }, { timestamps: true })
const UserSchema = new mongoose.Schema({ name: String, email: { type: String, unique: true }, password: String, role: String, department: mongoose.Schema.Types.ObjectId, isActive: { type: Boolean, default: true }, lastLogin: Date }, { timestamps: true })

const Department = mongoose.models.Department || mongoose.model('Department', DeptSchema)
const User = mongoose.models.User || mongoose.model('User', UserSchema)

async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB…')
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB!')

    await Department.deleteMany({})
    await User.deleteMany({})
    console.log('🗑️  Cleared existing data')

    const depts = await Department.insertMany([
      { name: 'Engineering', description: 'Software & infrastructure', color: '#3c82f6', quotaGB: 200 },
      { name: 'Finance', description: 'Finance & accounting', color: '#22c97e', quotaGB: 100 },
      { name: 'HR', description: 'Human resources', color: '#f472b6', quotaGB: 50 },
      { name: 'Marketing', description: 'Marketing & brand', color: '#fb923c', quotaGB: 100 },
      { name: 'Legal', description: 'Legal & compliance', color: '#4ade80', quotaGB: 75 },
    ])
    console.log('✅ Created 5 departments')

    const hash = await bcrypt.hash('Admin@2026', 12)
    await User.create({
      name: 'Sarah Admin',
      email: 'admin@cryptnest.com',
      password: hash,
      role: 'superadmin',
      department: depts[0]._id,
      isActive: true,
    })
    console.log('✅ Created superadmin user')

    // Create sample members
    const memberHash = await bcrypt.hash('Member@2026', 12)
    await User.insertMany([
      { name: 'Alex Chen', email: 'alex@cryptnest.com', password: memberHash, role: 'manager', department: depts[0]._id, isActive: true },
      { name: 'Priya Sharma', email: 'priya@cryptnest.com', password: memberHash, role: 'admin', department: depts[2]._id, isActive: true },
      { name: 'James Wilson', email: 'james@cryptnest.com', password: memberHash, role: 'member', department: depts[1]._id, isActive: true },
      { name: 'Sana Ali', email: 'sana@cryptnest.com', password: memberHash, role: 'member', department: depts[3]._id, isActive: true },
      { name: 'Victor Viewer', email: 'viewer@cryptnest.com', password: memberHash, role: 'viewer', department: depts[4]._id, isActive: true },
    ])
    console.log('✅ Created 5 sample users')

    console.log('')
    console.log('🪺 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🪺  CryptNest seeded successfully!')
    console.log('🪺 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('📧 Super Admin:  admin@cryptnest.com')
    console.log('🔑 Password:     Admin@2026')
    console.log('')
    console.log('📧 Other users:  alex / priya / james / sana / viewer @cryptnest.com')
    console.log('🔑 Password:     Member@2026')
    console.log('')
    console.log('👁️  Viewer user:  viewer@cryptnest.com')
    console.log('🔑 Password:     Member@2026')
    console.log('')
    console.log('🚀 Run: npm run dev')
    console.log('🌐 Open: http://localhost:3000')
  } catch (err) {
    console.error('❌ Seed error:', err.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

seed()
