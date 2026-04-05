import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { sendEmail } from '@/lib/email'

export async function POST(req) {
  try {
    await connectDB()
    const { name, email, company, role, message } = await req.json()

    if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })

    // Check if already a user
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return NextResponse.json({ error: 'An account with this email already exists. Try logging in instead.' }, { status: 400 })

    // Find all superadmins to notify
    const admins = await User.find({ role: { $in: ['superadmin', 'admin'] }, isActive: true }).select('email name').limit(5)

    // Send notification to all admins
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `🔔 New access request from ${name}`,
        html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f1117;color:#e8ecf4;border-radius:12px;overflow:hidden">
          <div style="background:#181c27;padding:24px;border-bottom:1px solid #2e3650;text-align:center">
            <span style="font-size:20px;font-weight:700">Crypt<span style="color:#f4a829">Nest</span></span>
          </div>
          <div style="padding:28px">
            <div style="background:#2e2008;border:1px solid #f4a829;border-radius:8px;padding:12px 14px;margin-bottom:20px;color:#f4a829;font-size:13px;font-weight:600">
              🔔 New access request
            </div>
            <p style="color:#8b93aa;font-size:14px;margin-bottom:20px">Hi <strong style="color:#e8ecf4">${admin.name}</strong>, someone is requesting access to CryptNest.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
              <tr><td style="padding:8px 0;color:#555e78;border-bottom:1px solid #2e3650">Name</td><td style="padding:8px 0;color:#e8ecf4;text-align:right;border-bottom:1px solid #2e3650;font-weight:600">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#555e78;border-bottom:1px solid #2e3650">Email</td><td style="padding:8px 0;color:#e8ecf4;text-align:right;border-bottom:1px solid #2e3650">${email}</td></tr>
              <tr><td style="padding:8px 0;color:#555e78;border-bottom:1px solid #2e3650">Company</td><td style="padding:8px 0;color:#e8ecf4;text-align:right;border-bottom:1px solid #2e3650">${company || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#555e78;border-bottom:1px solid #2e3650">Role</td><td style="padding:8px 0;color:#e8ecf4;text-align:right;border-bottom:1px solid #2e3650">${role || '—'}</td></tr>
              ${message ? `<tr><td style="padding:8px 0;color:#555e78" colspan="2">Message<br/><span style="color:#e8ecf4">${message}</span></td></tr>` : ''}
            </table>
            <p style="color:#8b93aa;font-size:13px">To approve this request, go to <strong style="color:#e8ecf4">Admin Panel → Invite User</strong> and add <strong style="color:#f4a829">${email}</strong>.</p>
          </div>
          <div style="padding:16px 28px;border-top:1px solid #2e3650;font-size:11px;color:#555e78;text-align:center">© 2026 CryptNest · Secure cloud storage</div>
        </div>`,
      })
    }

    // Also send confirmation to the requester
    await sendEmail({
      to: email,
      subject: '✅ Access request received — CryptNest',
      html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f1117;color:#e8ecf4;border-radius:12px;overflow:hidden">
        <div style="background:#181c27;padding:24px;border-bottom:1px solid #2e3650;text-align:center">
          <span style="font-size:20px;font-weight:700">Crypt<span style="color:#f4a829">Nest</span></span>
        </div>
        <div style="padding:28px;text-align:center">
          <div style="width:52px;height:52px;background:#0e2a1a;border:1px solid #22c97e;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px">✓</div>
          <h2 style="font-size:18px;font-weight:700;color:#e8ecf4;margin-bottom:8px">Request received!</h2>
          <p style="color:#8b93aa;font-size:14px;line-height:1.6;margin-bottom:16px">Hi <strong style="color:#e8ecf4">${name}</strong>, your request has been sent to the CryptNest admin team. You'll receive an email once your account is approved.</p>
          <p style="color:#555e78;font-size:12px">Typical response time: 1–2 business days.</p>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #2e3650;font-size:11px;color:#555e78;text-align:center">© 2026 CryptNest · Secure cloud storage</div>
      </div>`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Request access error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
