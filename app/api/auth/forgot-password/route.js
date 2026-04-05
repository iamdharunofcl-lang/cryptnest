import { NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { sendEmail } from '@/lib/email'

// Store reset tokens in memory (in production use Redis or DB)
export const resetTokens = new Map()

export async function POST(req) {
  try {
    await connectDB()
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const user = await User.findOne({ email: email.toLowerCase() })

    // Always return success to prevent email enumeration
    if (!user) return NextResponse.json({ success: true })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = Date.now() + 60 * 60 * 1000 // 1 hour

    // Store token (in production, save to DB)
    resetTokens.set(token, { userId: user._id.toString(), expires, email: user.email })

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

    await sendEmail({
      to: user.email,
      subject: '🔑 Reset your CryptNest password',
      html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f1117;color:#e8ecf4;border-radius:12px;overflow:hidden">
        <div style="background:#181c27;padding:24px;border-bottom:1px solid #2e3650;text-align:center">
          <span style="font-size:20px;font-weight:700">Crypt<span style="color:#f4a829">Nest</span></span>
        </div>
        <div style="padding:28px">
          <h2 style="font-size:18px;font-weight:700;color:#e8ecf4;margin-bottom:12px">Reset your password</h2>
          <p style="color:#8b93aa;font-size:14px;line-height:1.6;margin-bottom:20px">Hi <strong style="color:#e8ecf4">${user.name}</strong>, we received a request to reset your password. Click the button below to create a new one.</p>
          <a href="${resetUrl}" style="display:block;text-align:center;background:#f4a829;color:#000;padding:12px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;margin-bottom:20px">Reset password →</a>
          <p style="color:#555e78;font-size:12px;line-height:1.6">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <p style="color:#555e78;font-size:11px;margin-top:12px;word-break:break-all;">Or copy this link: ${resetUrl}</p>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #2e3650;font-size:11px;color:#555e78;text-align:center">© 2026 CryptNest · Secure cloud storage</div>
      </div>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
