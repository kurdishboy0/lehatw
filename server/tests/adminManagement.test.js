const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const h = require('./helpers/harness');
const users = require('../controllers/admin/usersController');
const approvals = require('../controllers/admin/approvalsController');
const moderation = require('../controllers/admin/moderationController');
const create = require('../controllers/admin/createController');
const setup = require('../controllers/accountSetupController');
const setupUtils = require('../utils/accountSetup');
const adminUser = { id: 3, email: 'admin@example.test', role: 'ADMIN', isSuperAdmin: false };
const superAdmin = { ...adminUser, isSuperAdmin: true };
beforeEach(h.reset);
const invoke = (handler, body = {}, target = h.user({ id: 8 }), acting = adminUser) => {
  h.on('user.findUnique', target);
  return h.invoke(handler, { user: acting, params: { id: target?.id || 8 }, body });
};

test('admin user search combines role, status, verification, email/name and pagination', async () => {
  h.on('user.count', 26); h.on('user.findMany', [h.user()]);
  const res = await h.invoke(users.listUsers, { user: adminUser, query: { q: 'Ahmed', role: 'STUDENT', status: 'ACTIVE', verified: 'yes', page: '2' } });
  assert.equal(res.body.totalPages, 2); const query = h.last('user.findMany');
  assert.equal(query.skip, 25); assert.ok(query.where.AND.some(x => x.phoneVerified === true));
  assert.equal('password' in query.select, false); assert.equal('resetOtp' in query.select, false);
});
for (const status of ['SUSPENDED', 'BANNED']) test(`admin ${status} requires a reason`, async () => {
  assert.equal((await invoke(users.setStatus, { status })).statusCode, 400); assert.equal(h.last('user.update'), undefined);
});
test('admin suspension persists the reason and future expiry, sends mail and audits', async () => {
  h.on('user.update', q => h.user({ id: 8, ...q.data }));
  const res = await invoke(users.setStatus, { status: 'SUSPENDED', reason: 'Repeated spam', until: '2099-01-01' });
  assert.equal(res.statusCode, 200); assert.equal(h.last('user.update').data.accountStatus, 'SUSPENDED');
  assert.equal(h.audits[0].action, 'USER_SUSPENDED'); assert.match(h.emails[0][2], /Repeated spam/);
});
test('reactivation clears the previous reason and suspension date', async () => {
  h.on('user.update', q => h.user({ id: 8, ...q.data }));
  const res = await invoke(users.setStatus, { status: 'ACTIVE' }, h.user({ id: 8, accountStatus: 'BANNED' }));
  assert.equal(res.statusCode, 200); assert.deepEqual(h.last('user.update').data, { accountStatus: 'ACTIVE', statusReason: null, suspendedUntil: null });
});
for (const until of ['nonsense', '2000-01-01']) test(`invalid suspension expiry ${until} is rejected`, async () => {
  assert.equal((await invoke(users.setStatus, { status: 'SUSPENDED', reason: 'Repeated spam', until })).statusCode, 400);
});
test('admin cannot ban itself or change another admin without super-admin access', async () => {
  assert.equal((await invoke(users.setStatus, { status: 'BANNED', reason: 'Repeated spam' }, h.user({ id: 3 }))).statusCode, 400);
  assert.equal((await invoke(users.setStatus, { status: 'BANNED', reason: 'Repeated spam' }, h.user({ id: 8, role: 'ADMIN' }))).statusCode, 403);
});
test('last active super-admin cannot be banned, demoted or deleted', async () => {
  h.on('user.count', 1);
  const target = h.user({ id: 8, role: 'ADMIN', isSuperAdmin: true });
  for (const [handler, body] of [[users.setStatus, { status: 'BANNED', reason: 'Testing guard' }],
    [users.setRole, { role: 'STUDENT' }], [users.deleteUser, { reason: 'Testing guard', confirmEmail: target.email }]]) {
    assert.equal((await invoke(handler, body, target, superAdmin)).statusCode, 400);
  }
});
test('ordinary admin cannot promote a user to admin', async () => {
  assert.equal((await invoke(users.setRole, { role: 'ADMIN' })).statusCode, 403);
});
test('super-admin promotion is audited and notifies the account', async () => {
  h.on('user.update', q => h.user({ id: 8, ...q.data }));
  assert.equal((await invoke(users.setRole, { role: 'ADMIN' }, h.user({ id: 8 }), superAdmin)).statusCode, 200);
  assert.equal(h.audits[0].action, 'USER_ROLE_CHANGED'); assert.equal(h.notifications[0].type, 'ROLE_CHANGED');
});
test('manual verification clears outstanding verification codes', async () => {
  h.on('user.update', q => h.user({ id: 8, ...q.data }));
  const res = await invoke(users.markVerified, {}, h.user({ id: 8, phoneVerified: false }));
  assert.equal(res.statusCode, 200); assert.deepEqual(h.last('user.update').data, { phoneVerified: true, phoneOtp: null, phoneOtpExpires: null });
  assert.equal(h.audits[0].action, 'USER_VERIFIED');
});
test('admin reset hashes the temporary password, invalidates old codes and excludes password from audit', async () => {
  h.on('user.update', {});
  const res = await invoke(users.resetPassword);
  assert.equal(res.statusCode, 200); assert.equal(await bcrypt.compare(res.body.tempPassword, h.last('user.update').data.password), true);
  assert.equal(h.last('user.update').data.resetOtp, null);
  assert.equal(JSON.stringify(h.audits).includes(res.body.tempPassword), false);
});
test('account deletion requires an exact confirmation email and reason', async () => {
  const res = await invoke(users.deleteUser, { reason: 'Cleanup test account', confirmEmail: 'wrong@example.test' });
  assert.equal(res.statusCode, 400); assert.equal(h.last('user.delete'), undefined);
});
test('deleting a talent account removes its profiles and only its own uploaded files', async () => {
  h.on('studentProfile.findUnique', { resumeUrl: 'resumes/own.pdf', photoUrl: 'https://storage.example.test/own.jpg' });
  h.on('application.findMany', [{ cvUrl: 'resumes/own-app.pdf' }]); h.on('message.count', 2);
  h.on('studentProfile.deleteMany', {}); h.on('hRProfile.deleteMany', {}); h.on('user.delete', {});
  const res = await invoke(users.deleteUser, { reason: 'Cleanup test account', confirmEmail: 'talent@example.test' });
  assert.equal(res.statusCode, 200); assert.equal(h.audits[0].action, 'USER_DELETED');
  assert.deepEqual(h.files.map(f => f.key).sort(), ['https://storage.example.test/own.jpg', 'resumes/own-app.pdf', 'resumes/own.pdf']);
});
for (const role of ['STUDENT', 'HR', 'INSTRUCTOR']) test(`admin-created ${role} gets a hashed setup token and password-free email`, async () => {
  h.on('user.findUnique', null); h.on('user.create', q => h.user({ id: 8, ...q.data }));
  h.on('accountSetupToken.deleteMany', {}); h.on('accountSetupToken.create', {});
  const res = await h.invoke(create.createAccount, { user: adminUser,
    body: { role, email: 'new@example.test', fullName: 'New Talent', university: 'University', fieldOfStudy: 'History', companyName: 'New Company' } });
  assert.equal(res.statusCode, 201); assert.equal('password' in h.last('user.create').data, false);
  assert.ok(res.body.setupUrl.startsWith('https://lehatw.example.test/set-password?token='));
  const token = new URL(res.body.setupUrl).searchParams.get('token');
  assert.equal(h.last('accountSetupToken.create').data.tokenHash, setupUtils.hash(token));
  assert.ok(h.emails[0][2].includes(res.body.setupUrl)); assert.doesNotMatch(h.emails[0][2], /Temporary password:/);
});
for (const scenario of ['expired', 'used', 'banned', 'unknown']) test(`account setup rejects ${scenario} token`, async () => {
  const row = { user: h.user({ accountStatus: scenario === 'banned' ? 'BANNED' : 'ACTIVE' }), expiresAt: new Date(Date.now() + (scenario === 'expired' ? -1000 : 60000)), usedAt: scenario === 'used' ? new Date() : null };
  h.on('accountSetupToken.findUnique', scenario === 'unknown' ? null : row);
  const res = await h.invoke(setup.completeSetup, { body: { token: 'test-setup-token', password: 'Test-password!23' } });
  assert.equal(res.statusCode, 400); assert.equal(h.last('user.update'), undefined);
});
test('company rejection requires a reason and conveys it through notifications/email/audit', async () => {
  assert.equal((await h.invoke(approvals.rejectCompany, { user: adminUser, params: { id: 31 } })).statusCode, 400);
  h.on('hRProfile.update', q => ({ ...h.job().hrProfile, ...q.data }));
  const res = await h.invoke(approvals.rejectCompany, { user: adminUser, params: { id: 31 }, body: { reason: 'Please fix registration details' } });
  assert.equal(res.statusCode, 200); assert.equal(h.last('hRProfile.update').data.status, 'REJECTED');
  assert.equal(h.notifications[0].body, 'Please fix registration details'); assert.match(h.emails[0][2], /Please fix registration details/);
  assert.equal(h.audits[0].action, 'COMPANY_REJECTED');
});
test('company approval clears rejection and audits the approving admin', async () => {
  h.on('hRProfile.update', q => ({ ...h.job().hrProfile, ...q.data }));
  assert.equal((await h.invoke(approvals.approveCompany, { user: adminUser, params: { id: 31 } })).statusCode, 200);
  assert.equal(h.last('hRProfile.update').data.rejectionReason, null); assert.equal(h.audits[0].adminId, 3);
});
test('custom-skill merge resolves duplicate spellings without duplicating existing skills', async () => {
  h.on('customSkill.findUnique', { id: 51, name: 'NodeJS', studentProfileId: 11 });
  h.on('skill.findUnique', { id: 7, name_en: 'Node.js' });
  h.on('customSkill.findMany', [{ id: 52, name: 'node js', studentProfileId: 12 }, { id: 53, name: 'Python', studentProfileId: 13 }]);
  h.on('studentSkill.findMany', [{ studentProfileId: 11 }]); h.on('studentSkill.createMany', {}); h.on('customSkill.deleteMany', {});
  h.on('studentProfile.findMany', [{ userId: 1 }, { userId: 4 }]);
  const res = await h.invoke(approvals.mergeCustomSkill, { user: adminUser, params: { id: 51 }, body: { skillId: 7, applyToAll: true } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.mergedCount, 2);
  assert.deepEqual(h.last('studentSkill.createMany').data, [{ studentProfileId: 12, skillId: 7, proficiency: 'Intermediate' }]);
  assert.deepEqual(h.last('customSkill.deleteMany').where.id.in, [51, 52]);
});
test('job moderation requires reason, hides the post and audits removal/restoration', async () => {
  assert.equal((await h.invoke(moderation.removeJob, { user: adminUser, params: { id: 21 } })).statusCode, 400);
  h.on('jobPost.update', q => h.job(q.data));
  assert.equal((await h.invoke(moderation.removeJob, { user: adminUser, params: { id: 21 }, body: { reason: 'Suspected fraudulent posting' } })).statusCode, 200);
  assert.equal(h.last('jobPost.update').data.isActive, false); assert.equal(h.audits[0].action, 'JOB_REMOVED');
  await h.invoke(moderation.restoreJob, { user: adminUser, params: { id: 21 } });
  assert.equal(h.last('jobPost.update').data.removedByAdmin, false); assert.equal(h.audits[1].action, 'JOB_RESTORED');
});
for (const status of ['RESOLVED', 'DISMISSED']) test(`report can be ${status} with actor and resolution note`, async () => {
  h.on('report.update', q => ({ id: 71, targetType: 'JOB', targetId: 21, reason: 'SPAM', ...q.data }));
  assert.equal((await h.invoke(moderation.closeReport, { user: adminUser, params: { id: 71 }, body: { status, note: 'Reviewed evidence' } })).statusCode, 200);
  assert.equal(h.last('report.update').data.resolvedById, 3); assert.equal(h.audits[0].action, `REPORT_${status}`);
});
