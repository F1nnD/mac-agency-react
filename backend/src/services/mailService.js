// Gửi email qua Resend (fetch, không cần thư viện).
// Biến môi trường: RESEND_API_KEY, MAIL_FROM, APP_URL.
// Chưa cấu hình thì chỉ ghi cảnh báo và không ném lỗi.

function appUrl() {
  return String(process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function buildResetUrl(token) {
  return `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendMail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.warn('[mail] Chưa cấu hình RESEND_API_KEY / MAIL_FROM nên không gửi được email.');
    return { sent: false, reason: 'not-configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text })
    });
    if (!res.ok) {
      console.error('[mail] Resend trả lỗi HTTP', res.status);
      return { sent: false, reason: 'provider-error' };
    }
    return { sent: true };
  } catch (err) {
    console.error('[mail] Gửi email thất bại:', err.message);
    return { sent: false, reason: 'network' };
  }
}

async function sendPasswordResetEmail(to, token) {
  const url = buildResetUrl(token);
  const subject = 'MAC Concept - Đặt lại mật khẩu';
  const text = `Bạn vừa yêu cầu đặt lại mật khẩu tại MAC Concept.\n\nMở liên kết sau (hiệu lực 30 phút, dùng một lần):\n${url}\n\nNếu không phải bạn yêu cầu, hãy bỏ qua email này.`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
<p>Bạn vừa yêu cầu đặt lại mật khẩu tại <b>MAC Concept</b>.</p>
<p><a href="${url}" style="display:inline-block;background:#fbbf24;color:#000;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Đặt lại mật khẩu</a></p>
<p>Liên kết có hiệu lực 30 phút và chỉ dùng được một lần.</p>
<p style="color:#666">Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p></div>`;
  const result = await sendMail({ to, subject, html, text });
  if (!result.sent && process.env.NODE_ENV !== 'production') {
    console.warn('[mail] (chỉ môi trường phát triển) Đường dẫn đặt lại mật khẩu:', url);
  }
  return result;
}

module.exports = { sendMail, sendPasswordResetEmail, buildResetUrl };
