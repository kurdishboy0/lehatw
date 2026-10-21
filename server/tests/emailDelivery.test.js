const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const sendEmail = require('../utils/sendEmail');
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
after(() => { global.fetch = originalFetch; for (const k of Object.keys(process.env)) if (!(k in originalEnv)) delete process.env[k]; Object.assign(process.env, originalEnv); });

test('Gmail HTTPS sends MIME mail and reuses the access token without SMTP', async () => {
  Object.assign(process.env, { EMAIL_TRANSPORT: 'gmail_api', EMAIL_USER: 'sender@example.test', GMAIL_CLIENT_ID: 'test-client', GMAIL_CLIENT_SECRET: 'test-secret', GMAIL_REFRESH_TOKEN: 'test-refresh' });
  let refreshes = 0, sends = 0;
  global.fetch = async (url, options) => {
    assert.ok(options.signal);
    if (url.endsWith('/token')) {
      refreshes++;
      assert.equal(options.body.get('grant_type'), 'refresh_token');
      return { ok: true, json: async () => ({ access_token: 'test-access', expires_in: 3600 }) };
    }
    assert.equal(url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    assert.equal(options.headers.Authorization, 'Bearer test-access');
    const mime = Buffer.from(JSON.parse(options.body).raw, 'base64url').toString();
    assert.match(mime, /To: recipient@example.test/); assert.match(mime, /verification code/);
    sends++; return { ok: true };
  };
  await sendEmail('recipient@example.test', 'Verify', 'Your verification code is 123456');
  await sendEmail('recipient@example.test', 'Verify', 'Your verification code is 654321');
  assert.equal(refreshes, 1); assert.equal(sends, 2);
});

test('Render without HTTPS credentials fails promptly without network calls', async () => {
  Object.assign(process.env, { RENDER: 'true', EMAIL_TRANSPORT: '', EMAIL_USER: 'sender@example.test', EMAIL_PASS: 'test-password' });
  global.fetch = async () => assert.fail('must not try an unconfigured transport');
  await assert.rejects(() => sendEmail('recipient@example.test', 'Verify', 'test'), /Email could not be sent/);
});

test('incomplete Gmail API configuration cannot fall back to SMTP', async () => {
  process.env.EMAIL_TRANSPORT = 'gmail_api'; delete process.env.GMAIL_REFRESH_TOKEN;
  await assert.rejects(() => sendEmail('recipient@example.test', 'Verify', 'test'), /Email could not be sent/);
});
