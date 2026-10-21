const nodemailer = require('nodemailer');

function isConfigured() {
  if (!process.env.EMAIL_USER) return false;
  if (process.env.EMAIL_TRANSPORT === 'gmail_api') {
    return Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
  }
  return !process.env.RENDER && Boolean(process.env.EMAIL_PASS);
}

// HTTPS transport for hosts that block outbound SMTP. These credentials
// belong only to the server's sending mailbox, never to talent signing in.
let cachedToken = null;
async function sendViaGmailApi(mail) {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) throw new Error('EMAIL_NOT_CONFIGURED');
  const tokenKey = `${clientId}:${refreshToken}`;
  if (!cachedToken || cachedToken.key !== tokenKey || cachedToken.expiresAt <= Date.now() + 60000) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' })
    });
    const token = await response.json();
    if (!response.ok || !token.access_token) throw new Error('EMAIL_AUTH_FAILED');
    cachedToken = { key: tokenKey, value: token.access_token, expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000 };
  }
  const mime = await nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' }).sendMail(mail);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${cachedToken.value}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: mime.message.toString('base64url') })
  });
  if (!response.ok) throw new Error('EMAIL_DELIVERY_FAILED');
}

const sendEmail = async (to, subject, text) => {
  try {
    if (!process.env.EMAIL_USER) throw new Error('EMAIL_NOT_CONFIGURED');
    const mail = { from: process.env.EMAIL_USER, to, subject, text };
    if (process.env.EMAIL_TRANSPORT === 'gmail_api') return await sendViaGmailApi(mail);
    // Fail promptly on Render rather than leave verification hanging while
    // attempting a connection to an SMTP port the host blocks.
    if (process.env.RENDER || !process.env.EMAIL_PASS) throw new Error('EMAIL_NOT_CONFIGURED');
    // 1. Create the transporter (the mailman)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Define the email options
    const mailOptions = {
      from: process.env.EMAIL_USER, // Sender address
      to: to,                       // Receiver address
      subject: subject,             // Subject line
      text: text,                   // Plain text body
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);
    
  } catch (error) {
    // Provider errors can contain credentials or message bodies. Keep those
    // out of logs and public API responses.
    console.error('Email delivery failed:', error.code || error.name);
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail;
module.exports.isConfigured = isConfigured;
