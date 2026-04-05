import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import connectDB from './mongodb.js'
import User from '../models/User.js'
import AuditLog from '../models/AuditLog.js'
import '../models/Department.js' // register Department schema with Mongoose

function isPrivateIP(ip) {
  if (!ip || ip === 'unknown') return true
  return (
    ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.') ||
    ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '::ffff:127.0.0.1'
  )
}

async function detectSuspiciousLogin(userId, ip) {
  try {
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000)
    const recentFailed = await AuditLog.countDocuments({
      user: userId, action: 'login', status: 'failed', createdAt: { $gte: tenMinsAgo },
    })
    if (recentFailed >= 3) return true

    if (!isPrivateIP(ip)) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const knownIPs = await AuditLog.distinct('ipAddress', {
        user: userId, action: 'login', status: 'success', createdAt: { $gte: thirtyDaysAgo },
      })
      if (knownIPs.length > 0 && !knownIPs.includes(ip)) return true
    }
  } catch (err) {
    console.error('[Auth] Suspicious login check failed:', err.message)
  }
  return false
}

async function sendSuspiciousAlert(user, ip) {
  try {
    const key = process.env.RESEND_API_KEY
    if (!key) return
    const { sendEmail, suspiciousLoginEmail } = await import('./email.js')
    await sendEmail(suspiciousLoginEmail({
      userName: user.name,
      email: user.email,
      ip,
      time: new Date().toLocaleString(),
    }))
  } catch (err) {
    console.error('[Auth] Suspicious alert email failed:', err.message)
  }
}

const providers = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials, req) {
      try {
        if (!credentials?.email || !credentials?.password) return null

        await connectDB()

        const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
          || req?.headers?.['x-real-ip']
          || 'unknown'
        const userAgent = req?.headers?.['user-agent'] || 'unknown'

        const user = await User.findOne({ email: credentials.email.toLowerCase() })
          .populate('department', 'name')

        if (!user) {
          await AuditLog.create({
            action: 'login', resource: credentials.email,
            ipAddress: ip, userAgent, status: 'failed',
            meta: { reason: 'User not found' },
          }).catch(() => {})
          return null
        }

        if (!user.isActive) {
          await AuditLog.create({
            user: user._id, action: 'login', resource: credentials.email,
            ipAddress: ip, userAgent, status: 'failed',
            meta: { reason: 'Account suspended' },
          }).catch(() => {})
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) {
          await AuditLog.create({
            user: user._id, action: 'login', resource: credentials.email,
            ipAddress: ip, userAgent, status: 'failed',
            meta: { reason: 'Wrong password' },
          }).catch(() => {})
          return null
        }

        const suspicious = await detectSuspiciousLogin(user._id, ip)
        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(() => {})

        await AuditLog.create({
          user: user._id, action: 'login', resource: 'Authentication',
          ipAddress: ip, userAgent,
          status: suspicious ? 'suspicious' : 'success',
          meta: { suspicious, provider: 'credentials' },
        }).catch(() => {})

        if (suspicious) sendSuspiciousAlert(user, ip)

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department?.name || '',
        }
      } catch (err) {
        console.error('[Auth] Authorize error:', err.message)
        return null
      }
    },
  }),
]

// ✅ Only add Google provider if BOTH keys are present and non-empty
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID.trim() !== '' &&
  process.env.GOOGLE_CLIENT_SECRET.trim() !== ''
) {
  try {
    const { default: GoogleProvider } = await import('next-auth/providers/google')
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    )
    console.log('[Auth] Google SSO enabled')
  } catch (err) {
    console.error('[Auth] Failed to load Google provider:', err.message)
  }
}

export const authOptions = {
  providers,
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          await connectDB()
          const { default: User } = await import('../models/User.js')
          let dbUser = await User.findOne({ email: user.email.toLowerCase() })
          if (!dbUser) {
            dbUser = await User.create({
              name: user.name,
              email: user.email.toLowerCase(),
              password: 'google-sso-' + Math.random().toString(36),
              role: 'member',
              isActive: true,
              lastLogin: new Date(),
            })
          } else {
            if (!dbUser.isActive) return false
            await User.findByIdAndUpdate(dbUser._id, { lastLogin: new Date() })
          }
          user.id = dbUser._id.toString()
          user.role = dbUser.role
          user.department = ''
        } catch (err) {
          console.error('[Auth] Google signIn error:', err.message)
          return false
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role || 'member'
        token.department = user.department || ''
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.department = token.department
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}
