// lib/email.js
// Uses Resend API directly via fetch — no npm package needed
// Sign up free at resend.com → get API key → add to .env.local as RESEND_API_KEY

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.EMAIL_FROM || 'CryptNest <noreply@cryptnest.com>'

export async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log('[Email] No RESEND_API_KEY set — skipping email:', subject)
    return { success: false, reason: 'No API key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: Array.isArray(to) ? to : [to], subject, html }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Email failed')
    return { success: true, id: data.id }
  } catch (err) {
    console.error('[Email] Send failed:', err.message)
    return { success: false, error: err.message }
  }
}

export function suspiciousLoginEmail({ userName, email, ip, time }) {
  return {
    to: email,
    subject: '⚠️ Suspicious login detected — CryptNest',
    html: `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f1117;color:#e8ecf4;border-radius:12px;overflow:hidden">
      <div style="background:#181c27;padding:24px;border-bottom:1px solid #2e3650;text-align:center">
        <span style="font-size:20px;font-weight:700">Crypt<span style="color:#f4a829">Nest</span></span>
      </div>
      <div style="padding:28px">
        <div style="background:#2a0e0e;border:1px solid #7a1f1f;border-radius:8px;padding:14px;margin-bottom:20px;color:#f87171;font-size:14px;font-weight:600">⚠️ Suspicious login detected on your account</div>
        <p style="color:#8b93aa;font-size:14px;margin-bottom:16px">Hi <strong style="color:#e8ecf4">${userName}</strong>,</p>
        <p style="color:#8b93aa;font-size:14px;line-height:1.6;margin-bottom:20px">We detected a login to your CryptNest account from a new location or after multiple failed attempts.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
          <tr><td style="padding:8px 0;color:#555e78;border-bottom:1px solid #2e3650">IP Address</td><td style="padding:8px 0;color:#e8ecf4;text-align:right;border-bottom:1px solid #2e3650;font-family:monospace">${ip}</td></tr>
          <tr><td style="padding:8px 0;color:#555e78">Time</td><td style="padding:8px 0;color:#e8ecf4;text-align:right">${time}</td></tr>
        </table>
        <p style="color:#8b93aa;font-size:13px;line-height:1.6">If this was you, no action needed. If not, please contact your system administrator immediately and change your password.</p>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #2e3650;font-size:11px;color:#555e78;text-align:center">© 2026 CryptNest · Secure cloud storage</div>
    </div>`,
  }
}

export function fileSharedEmail({ recipientEmail, senderName, fileName, shareUrl, permission }) {
  return {
    to: recipientEmail,
    subject: `📁 ${senderName} shared a file with you — CryptNest`,
    html: `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f1117;color:#e8ecf4;border-radius:12px;overflow:hidden">
      <div style="background:#181c27;padding:24px;border-bottom:1px solid #2e3650;text-align:center">
        <span style="font-size:20px;font-weight:700">Crypt<span style="color:#f4a829">Nest</span></span>
      </div>
      <div style="padding:28px">
        <p style="color:#8b93aa;font-size:14px;margin-bottom:16px"><strong style="color:#e8ecf4">${senderName}</strong> shared a file with you:</p>
        <div style="background:#181c27;border:1px solid #2e3650;border-radius:8px;padding:16px;margin-bottom:20px">
          <div style="font-size:15px;font-weight:700;color:#e8ecf4;margin-bottom:4px">${fileName}</div>
          <div style="font-size:12px;color:#8b93aa">Permission: <span style="color:#f4a829;font-weight:600;text-transform:capitalize">${permission}</span></div>
        </div>
        <a href="${shareUrl}" style="display:block;text-align:center;background:#f4a829;color:#000;padding:12px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">Access file →</a>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #2e3650;font-size:11px;color:#555e78;text-align:center">© 2026 CryptNest · Secure cloud storage</div>
    </div>`,
  }
}

export function welcomeEmail({ userName, email }) {
  return {
    to: email,
    subject: '🪺 Welcome to CryptNest!',
    html: `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0f1117;color:#e8ecf4;border-radius:12px;overflow:hidden">
      <div style="background:#181c27;padding:24px;border-bottom:1px solid #2e3650;text-align:center">
        <span style="font-size:20px;font-weight:700">Crypt<span style="color:#f4a829">Nest</span></span>
        <p style="font-size:12px;color:#555e78;margin-top:4px">A safe nest for every file.</p>
      </div>
      <div style="padding:28px">
        <p style="color:#8b93aa;font-size:14px;margin-bottom:16px">Hi <strong style="color:#e8ecf4">${userName}</strong>, welcome to CryptNest!</p>
        <p style="color:#8b93aa;font-size:14px;line-height:1.6;margin-bottom:20px">Your account has been created. You can now securely upload, manage and share files with your organization.</p>
        <div style="background:#181c27;border:1px solid #2e3650;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px">
          <div style="color:#e8ecf4;margin-bottom:8px"><span style="color:#22c97e">✓</span> AES-256 encryption on all files</div>
          <div style="color:#e8ecf4;margin-bottom:8px"><span style="color:#22c97e">✓</span> Role-based access control</div>
          <div style="color:#e8ecf4"><span style="color:#22c97e">✓</span> Full audit trail</div>
        </div>
        <p style="font-size:13px;color:#8b93aa">Login email: <strong style="color:#e8ecf4">${email}</strong></p>
      </div>
      <div style="padding:16px 28px;border-top:1px solid #2e3650;font-size:11px;color:#555e78;text-align:center">© 2026 CryptNest · Secure cloud storage</div>
    </div>`,
  }
}
