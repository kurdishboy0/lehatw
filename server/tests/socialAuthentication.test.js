const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const h = require('./helpers/harness');
const auth = require('../controllers/authController');
const guardedFetch = global.fetch;
const previousGoogleId = process.env.GOOGLE_CLIENT_ID;
const previousRedirect = process.env.LINKEDIN_REDIRECT_URI;
let info, providerUser, requests, firstOk, secondOk;
beforeEach(() => {
  h.reset(); requests = []; firstOk = secondOk = true;
  process.env.GOOGLE_CLIENT_ID = 'test-only-google-client'; delete process.env.LINKEDIN_REDIRECT_URI;
  info = { aud: 'test-only-google-client', email_verified: 'true', email: 'talent@example.test', sub: 'google-subject' };
  providerUser = { email: 'talent@example.test', sub: 'google-subject', email_verified: true };
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    const first = requests.length === 1;
    return { ok: first ? firstOk : secondOk, json: async () => first && String(url).includes('tokeninfo') ? info : first ? { access_token: 'test-only-provider-token' } : providerUser };
  };
});
after(() => {
  global.fetch = guardedFetch;
  if (previousGoogleId === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = previousGoogleId;
  if (previousRedirect === undefined) delete process.env.LINKEDIN_REDIRECT_URI; else process.env.LINKEDIN_REDIRECT_URI = previousRedirect;
});
test('Google rejects tokens issued to a different application', async () => {
  info.aud = 'another-client';
  assert.equal((await h.invoke(auth.googleLogin, { body: { token: 'test-token' } })).statusCode, 401);
  assert.equal(h.calls.length, 0);
});
test('Google rejects unverified provider email', async () => {
  info.email_verified = 'false';
  assert.equal((await h.invoke(auth.googleLogin, { body: { token: 'test-token' } })).statusCode, 401);
  assert.equal(h.calls.length, 0);
});
for (const mismatch of ['email', 'sub']) test(`Google tokeninfo and userinfo must agree on ${mismatch}`, async () => {
  providerUser[mismatch] = 'different-user';
  assert.equal((await h.invoke(auth.googleLogin, { body: { token: 'test-token' } })).statusCode, 401);
});
test('Google provider rejection fails closed', async () => {
  firstOk = false;
  assert.equal((await h.invoke(auth.googleLogin, { body: { token: 'test-token' } })).statusCode, 401);
});
test('verified Google signup creates talent rather than a requested admin', async () => {
  h.on('user.findFirst', null); h.on('user.create', q => h.user(q.data));
  const res = await h.invoke(auth.googleLogin, { body: { token: 'test-token', role: 'ADMIN' } });
  assert.equal(res.statusCode, 200); assert.equal(h.last('user.create').data.role, 'STUDENT');
  assert.equal(h.last('user.create').data.phoneVerified, true); assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).role, 'STUDENT');
});
test('Google preserves the existing company role and cannot bypass a ban', async () => {
  h.on('user.findFirst', h.user({ role: 'HR', googleId: 'google-subject' }));
  let res = await h.invoke(auth.googleLogin, { body: { token: 'test-token' } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.user.role, 'HR');
  requests.length = 0; h.on('user.findFirst', h.user({ googleId: 'google-subject', accountStatus: 'BANNED' }));
  res = await h.invoke(auth.googleLogin, { body: { token: 'test-token' } }); assert.equal(res.statusCode, 403);
});
for (const redirectUri of ['http://localhost:5173/login', 'https://lehato.netlify.app/login']) test(`LinkedIn uses the exact registered callback ${redirectUri}`, async () => {
  h.on('user.findFirst', h.user({ linkedinId: 'google-subject' }));
  const res = await h.invoke(auth.linkedinLogin, { body: { code: 'test-only-code', redirectUri } });
  assert.equal(res.statusCode, 200); assert.equal(requests[0].options.body.get('redirect_uri'), redirectUri);
});
test('LinkedIn rejects missing codes and malformed callback paths before provider access', async () => {
  for (const body of [{}, { code: 'test-code', redirectUri: 'https://example.test/wrong' }, { code: 'test-code', redirectUri: 'javascript:bad' }]) {
    assert.equal((await h.invoke(auth.linkedinLogin, { body })).statusCode, 400);
  }
  assert.equal(requests.length, 0);
});
test('LinkedIn provider failure cannot yield a local JWT', async () => {
  firstOk = false;
  const res = await h.invoke(auth.linkedinLogin, { body: { code: 'test-code', redirectUri: 'https://lehato.netlify.app/login' } });
  assert.equal(res.statusCode, 401); assert.equal(res.body.token, undefined);
});

test('LinkedIn rejects a different provider subject already linked to the same email', async () => {
  h.on('user.findFirst', h.user({ linkedinId: 'another-linkedin-subject' }));
  const res = await h.invoke(auth.linkedinLogin, { body: { code: 'test-code', redirectUri: 'https://lehato.netlify.app/login' } });
  assert.equal(res.statusCode, 401); assert.equal(h.last('user.update'), undefined);
});
test('LinkedIn creates a verified talent account only from a complete verified identity', async () => {
  providerUser.email = ' NEW@EXAMPLE.TEST ';
  h.on('user.findFirst', null); h.on('user.create', q => h.user(q.data));
  const res = await h.invoke(auth.linkedinLogin, { body: { code: 'test-code', redirectUri: 'https://lehato.netlify.app/login' } });
  assert.equal(res.statusCode, 200); assert.equal(h.last('user.create').data.email, 'new@example.test');
  assert.equal(h.last('user.create').data.phoneVerified, true); assert.equal(res.body.user.role, 'STUDENT');
});
test('LinkedIn cannot link or log into a banned account', async () => {
  h.on('user.findFirst', h.user({ accountStatus: 'BANNED', phoneVerified: false }));
  const res = await h.invoke(auth.linkedinLogin, { body: { code: 'test-code', redirectUri: 'https://lehato.netlify.app/login' } });
  assert.equal(res.statusCode, 403); assert.equal(h.last('user.update'), undefined);
});
for (const sub of [undefined, '', 123]) test(`LinkedIn rejects invalid provider subject ${JSON.stringify(sub)}`, async () => {
  providerUser.sub = sub;
  assert.equal((await h.invoke(auth.linkedinLogin, { body: { code: 'test-code', redirectUri: 'https://lehato.netlify.app/login' } })).statusCode, 401);
  assert.equal(h.calls.length, 0);
});
