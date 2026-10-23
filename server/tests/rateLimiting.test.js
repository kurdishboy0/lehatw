const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/harness');
const { startApi } = require('./helpers/http');
const { loginLimiter, codeCheckLimiter, codeSendLimiter, registerLimiter } = require('../middleware/rateLimit');
let api;
before(async () => { api = await startApi([], app => {
  app.post('/login', loginLimiter, (req, res) => res.status(req.body.success ? 200 : 401).json({ ok: Boolean(req.body.success) }));
  app.post('/check', codeCheckLimiter, (req, res) => res.status(400).json({ ok: false }));
  app.post('/send', codeSendLimiter, (req, res) => res.json({ ok: true }));
  app.post('/register', registerLimiter, (req, res) => res.status(201).json({ ok: true }));
}); });
after(async () => { if (api) await api.close(); });
test('sixth code-send request for the same account/address is rate limited', async () => {
  for (let n = 1; n <= 6; n++) {
    const res = await api.call('POST', '/send', { body: { email: 'limited@example.test' } });
    assert.equal(res.status, n <= 5 ? 200 : 429);
    if (n === 6) { assert.equal(res.body.code, 'RATE_LIMITED'); assert.ok(res.headers.get('retry-after')); }
  }
});
test('code-send limits normalize case and whitespace in email addresses', async () => {
  for (let n = 1; n <= 6; n++) {
    const res = await api.call('POST', '/send', { body: { email: n % 2 ? ' NORMALIZED@example.test ' : 'normalized@example.test' } });
    assert.equal(res.status, n <= 5 ? 200 : 429);
  }
});
test('code-guessing limit blocks the ninth attempt', async () => {
  for (let n = 1; n <= 9; n++) assert.equal((await api.call('POST', '/check', { body: { email: 'guess@example.test' } })).status, n <= 8 ? 400 : 429);
});
test('login limit counts failures and blocks the eleventh attempt', async () => {
  for (let n = 1; n <= 11; n++) assert.equal((await api.call('POST', '/login', { body: { email: 'failed@example.test' } })).status, n <= 10 ? 401 : 429);
});
test('successful logins do not exhaust the failure allowance', async () => {
  for (let n = 0; n < 12; n++) assert.equal((await api.call('POST', '/login', { body: { email: 'success@example.test', success: true } })).status, 200);
});
test('another account is not blocked by the first account code requests', async () => {
  assert.equal((await api.call('POST', '/send', { body: { email: 'another@example.test' } })).status, 200);
});
test('registration limits bulk requests by address rather than supplied email', async () => {
  for (let n = 1; n <= 41; n++) assert.equal((await api.call('POST', '/register', { body: { email: `new${n}@example.test` } })).status, n <= 40 ? 201 : 429);
});
