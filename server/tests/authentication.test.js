const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const h = require('./helpers/harness');
const auth = require('../controllers/authController');
const middleware = require('../middleware/authMiddleware');
const { hashOtp, generateOtp, otpMatches, notExpired, OTP_TTL_MS } = require('../utils/otpCodes');
const password = 'Test-only-password!23';
const passwordHash = bcrypt.hashSync(password, 4);
beforeEach(h.reset);

for (const role of ['STUDENT', 'HR', 'INSTRUCTOR', 'ADMIN']) test(`registration safely handles requested role ${role}`, async () => {
  h.on('user.findFirst', null); h.on('user.create', q => h.user({ id: 8, ...q.data }));
  h.on('hRProfile.create', {}); h.on('instructorProfile.create', {});
  const res = await h.invoke(auth.registerUser, { body: { email: ' TALENT@EXAMPLE.TEST ', password, role, fullName: 'Test Instructor', companyName: 'Company' } });
  assert.equal(res.statusCode, 201);
  const created = h.last('user.create').data;
  assert.equal(created.email, 'talent@example.test'); assert.equal(await bcrypt.compare(password, created.password), true);
  assert.equal(created.role, role === 'ADMIN' ? 'STUDENT' : role);
  assert.equal('password' in res.body.user, false); assert.equal('token' in res.body, false);
  if (role === 'HR') assert.equal(h.last('hRProfile.create').data.userId, 8);
  if (role === 'INSTRUCTOR') assert.equal(h.last('instructorProfile.create').data.userId, 8);
});
test('duplicate registration is refused without creating another user', async () => {
  h.on('user.findFirst', h.user());
  assert.equal((await h.invoke(auth.registerUser, { body: { email: 'talent@example.test', password } })).statusCode, 400);
  assert.equal(h.last('user.create'), undefined);
});
for (const invalid of ['', 'short', 'a'.repeat(73)]) test(`registration rejects password length ${invalid.length}`, async () => {
  const res = await h.invoke(auth.registerUser, { body: { email: 'talent@example.test', password: invalid } });
  assert.equal(res.statusCode, 400); assert.equal(h.calls.length, 0);
});
test('login returns a one-day JWT and omits the stored password and codes', async () => {
  h.on('user.findFirst', h.user({ password: passwordHash, resetOtp: 'private', phoneOtp: 'private' }));
  const res = await h.invoke(auth.loginUser, { body: { email: 'talent@example.test', password } });
  assert.equal(res.statusCode, 200);
  const token = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(token.id, 1); assert.equal(token.exp - token.iat, 86400);
  for (const key of ['password', 'resetOtp', 'phoneOtp']) assert.equal(key in res.body.user, false);
});
test('wrong login password does not disclose a ban reason', async () => {
  h.on('user.findFirst', h.user({ password: passwordHash, accountStatus: 'BANNED', statusReason: 'Private reason' }));
  const res = await h.invoke(auth.loginUser, { body: { email: 'talent@example.test', password: 'wrong-password' } });
  assert.equal(res.statusCode, 401); assert.doesNotMatch(JSON.stringify(res.body), /Private reason/);
});
for (const status of ['BANNED', 'SUSPENDED']) test(`${status} account cannot log in with the correct password`, async () => {
  h.on('user.findFirst', h.user({ password: passwordHash, accountStatus: status, statusReason: 'Moderation reason' }));
  const res = await h.invoke(auth.loginUser, { body: { email: 'talent@example.test', password } });
  assert.equal(res.statusCode, 403); assert.equal(res.body.code, `ACCOUNT_${status}`);
});
test('email verification accepts the correct code once and clears stored code data', async () => {
  let row = h.user({ phoneVerified: false, phoneOtp: hashOtp('123456'), phoneOtpExpires: new Date(Date.now() + OTP_TTL_MS) });
  h.on('user.findFirst', () => row);
  h.on('user.update', q => { row = { ...row, ...q.data }; return row; });
  const first = await h.invoke(auth.verifyPhoneOtp, { body: { email: row.email, otp: '123456' } });
  assert.equal(first.statusCode, 200); assert.equal(row.phoneVerified, true); assert.equal(row.phoneOtp, null);
  assert.ok(first.body.token);
  const second = await h.invoke(auth.verifyPhoneOtp, { body: { email: row.email, otp: '123456' } });
  assert.equal(second.statusCode, 400);
});
for (const scenario of ['wrong', 'expired', 'absent']) test(`verification rejects ${scenario} code`, async () => {
  h.on('user.findFirst', scenario === 'absent' ? null : h.user({ phoneOtp: hashOtp('123456'), phoneOtpExpires: new Date(Date.now() + (scenario === 'expired' ? -1000 : 60000)) }));
  const res = await h.invoke(auth.verifyPhoneOtp, { body: { email: 'talent@example.test', otp: scenario === 'wrong' ? '111111' : '123456' } });
  assert.equal(res.statusCode, 400); assert.equal(h.last('user.update'), undefined);
});
test('password reset hashes the replacement, clears the code and prevents reuse', async () => {
  let row = h.user({ password: passwordHash, resetOtp: hashOtp('654321'), resetOtpExpires: new Date(Date.now() + 60000) });
  h.on('user.findFirst', () => row); h.on('user.update', q => { row = { ...row, ...q.data }; return row; });
  const res = await h.invoke(auth.resetPassword, { body: { email: row.email, otp: '654321', newPassword: 'Changed-test-only!45' } });
  assert.equal(res.statusCode, 200); assert.equal(await bcrypt.compare('Changed-test-only!45', row.password), true);
  assert.equal(row.resetOtp, null); assert.ok(row.passwordChangedAt instanceof Date);
  assert.equal((await h.invoke(auth.resetPassword, { body: { email: row.email, otp: '654321', newPassword: password } })).statusCode, 400);
});
for (const otp of [undefined, '', '000000', 123456]) test(`reset cannot bypass code validation with ${JSON.stringify(otp)}`, async () => {
  h.on('user.findFirst', h.user({ resetOtp: hashOtp('123456'), resetOtpExpires: new Date(Date.now() + 60000) }));
  assert.equal((await h.invoke(auth.resetPassword, { body: { email: 'talent@example.test', otp, newPassword: password } })).statusCode, 400);
  assert.equal(h.last('user.update'), undefined);
});
test('expired password-reset code cannot be used', async () => {
  h.on('user.findFirst', h.user({ resetOtp: hashOtp('123456'), resetOtpExpires: new Date(Date.now() - 1000) }));
  assert.equal((await h.invoke(auth.resetPassword, { body: { email: 'talent@example.test', otp: '123456', newPassword: password } })).statusCode, 400);
});
test('one-time code primitives reject invalid hashes and expired dates', () => {
  for (let n = 0; n < 50; n++) assert.match(generateOtp(), /^\d{6}$/);
  assert.ok(otpMatches('123456', hashOtp('123456'))); assert.equal(otpMatches('123456', '123456'), false);
  assert.equal(otpMatches('123456', 'invalid'), false); assert.equal(notExpired(null), false);
  assert.equal(notExpired(new Date(Date.now() - 1)), false);
});

async function authorize(token, row) {
  h.on('user.findUnique', row);
  const req = h.request({ headers: token ? { authorization: `Bearer ${token}` } : {} });
  const res = h.response(); let passed = false;
  await middleware.protect(req, res, () => { passed = true; });
  return { req, res, passed };
}
test('protected middleware rejects missing, forged and expired JWTs', async () => {
  for (const token of [null, 'forged', jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
    const { passed, res } = await authorize(token, h.user());
    assert.equal(passed, false); assert.equal(res.statusCode, 401);
  }
});
test('database role overrides the role claimed in an existing JWT', async () => {
  const token = jwt.sign({ id: 1, role: 'ADMIN' }, process.env.JWT_SECRET);
  const { req, passed } = await authorize(token, h.user({ role: 'STUDENT' }));
  assert.ok(passed); assert.equal(req.user.role, 'STUDENT');
});
test('deleted account loses protected access', async () => {
  const { passed, res } = await authorize(jwt.sign({ id: 1 }, process.env.JWT_SECRET), null);
  assert.equal(passed, false); assert.equal(res.body.code, 'ACCOUNT_DELETED');
});
test('tokens minted before a password change are rejected', async () => {
  const token = jwt.sign({ id: 1, iat: Math.floor(Date.now() / 1000) - 100 }, process.env.JWT_SECRET);
  const { passed, res } = await authorize(token, h.user({ passwordChangedAt: new Date() }));
  assert.equal(passed, false); assert.equal(res.body.code, 'PASSWORD_CHANGED');
});
test('admin invalidation makes a ban effective on an already-cached session', async () => {
  let row = h.user(); h.on('user.findUnique', () => row);
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
  let res = h.response(); let passed = false;
  await middleware.protect(h.request({ headers: { authorization: `Bearer ${token}` } }), res, () => { passed = true; });
  assert.ok(passed); row = { ...row, accountStatus: 'BANNED' }; middleware.invalidateUserCache(1);
  res = h.response(); passed = false;
  await middleware.protect(h.request({ headers: { authorization: `Bearer ${token}` } }), res, () => { passed = true; });
  assert.equal(passed, false); assert.equal(res.statusCode, 403);
});
test('expired suspension lifts while indefinite suspension still blocks', async () => {
  h.on('user.update', {});
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET);
  assert.equal((await authorize(token, h.user({ accountStatus: 'SUSPENDED', suspendedUntil: new Date(Date.now() - 1000) }))).passed, true);
  middleware.invalidateUserCache(1);
  assert.equal((await authorize(token, h.user({ accountStatus: 'SUSPENDED', suspendedUntil: null }))).res.statusCode, 403);
});
for (const role of ['STUDENT', 'HR', 'INSTRUCTOR']) test(`admin guards reject ${role}`, () => {
  for (const guard of [middleware.adminOnly, middleware.superAdminOnly]) {
    const res = h.response(); guard(h.request({ user: { role } }), res, () => assert.fail('must not authorize'));
    assert.equal(res.statusCode, 403);
  }
});
test('ordinary admin cannot reach super-admin actions', () => {
  const res = h.response(); middleware.superAdminOnly(h.request({ user: { role: 'ADMIN', isSuperAdmin: false } }), res, () => assert.fail('must not authorize'));
  assert.equal(res.statusCode, 403);
});
