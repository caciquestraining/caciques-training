const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { to_email, contact_name, player_name, session_type, day, time, amount, payment, status_message, email_body } = req.body;

    if (!to_email) return res.status(400).json({ error: 'Missing to_email' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASS
      }
    });

    const isConfirmed = status_message && status_message.includes('confirmed');

    await transporter.sendMail({
      from: `"Caciques Training" <${process.env.GMAIL_USER}>`,
      to: to_email,
      subject: `${isConfirmed ? '✅ Session Confirmed' : '❌ Booking Update'} — ${player_name}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f7f4ee;padding:32px;border-radius:8px;">
        <div style="background:#1B4D2E;padding:24px;border-radius:6px;text-align:center;margin-bottom:24px;">
          <h1 style="color:#F5A623;font-size:1.6rem;margin:0;letter-spacing:.1em;">CACIQUES TRAINING</h1>
          <p style="color:rgba(255,255,255,.7);font-size:.85rem;margin:6px 0 0;">Elite Baseball Academy · Tampa, FL</p>
        </div>
        <h2 style="color:#1B4D2E;font-size:1.2rem;">${status_message}</h2>
        <p style="color:#555;">Hi ${contact_name},</p>
        <p style="color:#555;white-space:pre-line;">${email_body}</p>
        <div style="background:#fff;border:1px solid #ddd;border-radius:6px;padding:16px;margin:20px 0;">
          <p style="margin:4px 0;color:#333;"><strong>Player:</strong> ${player_name}</p>
          <p style="margin:4px 0;color:#333;"><strong>Session:</strong> ${session_type}</p>
          <p style="margin:4px 0;color:#333;"><strong>Day:</strong> ${day} @ ${time}</p>
          <p style="margin:4px 0;color:#333;"><strong>Amount:</strong> ${amount}</p>
          <p style="margin:4px 0;color:#333;"><strong>Payment:</strong> ${payment}</p>
        </div>
        <p style="color:#888;font-size:.8rem;text-align:center;margin-top:24px;">Questions? Call or text (813) 998-7941<br>caciquestrainingllc@gmail.com</p>
      </div>`
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
};
