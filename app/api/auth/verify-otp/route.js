import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { sendEmail } from '@/lib/email'

// In-memory OTP store (use Redis in production)
const otpStore = new Map()

export async function POST(req) {
  try {
    await connectDB()
    const { action, email, otp } = await req.json()

    if (action === 'send') {
      const user = await User.findOne({ email: email?.toLowerCase() })
      if (!user) return NextResponse.json({ success: true }) // Don't reveal if user exists

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = Date.now() + 10 * 60 * 1000 // 10 minutes

      otpStore.set(email.toLowerCase(), { code, expires, userId: user._id.toString() })

      // Send OTP email
      await sendEmail({
        to: user.email,
        subject: '🔐 Your CryptNest verification code',
        html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f1117;color:#e8ecf4;border-radius:12px;overflow:hidden">
          <div style="background:#181c27;padding:24px;border-bottom:1px solid #2e3650;text-align:center">
            <span style="font-size:20px;font-weight:700">Crypt<span style="color:#f4a829">Nest</span></span>
          </div>
          <div style="padding:28px;text-align:center">
            <p style="color:#8b93aa;font-size:14px;margin-bottom:20px">Hi ${user.name}, use this code to verify your identity:</p>
            <div style="background:#181c27;border:2px solid #f4a829;border-radius:12px;padding:24px;margin-bottom:20px;display:inline-block">
              <div style="font-size:40px;font-weight:800;color:#f4a829;letter-spacing:10px;font-family:monospace">${code}</div>
            </div>
            <p style="color:#555e78;font-size:12px">Code expires in 10 minutes. Don't share this with anyone.</p>
          </div>
          <div style="padding:16px 28px;border-top:1px solid #2e3650;font-size:11px;color:#555e78;text-align:center">© 2026 CryptNest · Secure cloud storage</div>
        </div>`,
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'verify') {
      const record = otpStore.get(email?.toLowerCase())
      if (!record) return NextResponse.json({ valid: false, error: 'OTP not found or expired' })
      if (Date.now() > record.expires) { otpStore.delete(email.toLowerCase()); return NextResponse.json({ valid: false, error: 'OTP expired' }) }
      if (record.code !== otp) return NextResponse.json({ valid: false, error: 'Incorrect code' })

      otpStore.delete(email.toLowerCase())
      return NextResponse.json({ valid: true, userId: record.userId })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
