const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const { getAnalytics } = require('../controllers/admin/analyticsController');
const { getPendingCounts } = require('../controllers/admin/overviewController');
const { listAudit } = require('../controllers/admin/auditController');
const { getPublicStats } = require('../controllers/statsController');
const instructor = require('../controllers/instructorController');
const setup = require('../controllers/accountSetupController');
const bcrypt = require('bcrypt');
delete require.cache[require.resolve('../utils/audit')];
const { logAdminAction } = require('../utils/audit');
beforeEach(h.reset);

function analyticsFixtures() {
  h.on('user.count', q => q?.where?.phoneVerified ? 3 : q?.where?.role === 'STUDENT' ? 10 : q?.where?.role === 'HR' ? 2 : 5);
  h.on('hRProfile.count', q => q.where.status === 'APPROVED' ? 2 : 1);
  h.on('jobPost.count', 4); h.on('application.count', 8); h.on('user.findMany', []);
  h.on('customSkill.count', 2); h.on('report.count', 3); h.on('jobPost.findMany', []);
  h.on('jobPostSkill.groupBy', [{ skillId: 1, _count: { skillId: 4 } }]);
  h.on('skill.findMany', [h.skill(1).skill]); h.on('studentSkill.groupBy', [{ skillId: 1, _count: { skillId: 7 } }]);
}
test('analytics computes totals, verification rate, demand/supply and pending counts', async () => {
  analyticsFixtures(); const res = await h.invoke(getAnalytics);
  assert.equal(res.statusCode, 200); assert.equal(res.body.totals.students, 10);
  assert.equal(res.body.totals.verification.rate, 0.6);
  assert.deepEqual(res.body.pending, { companies: 1, skills: 2, reports: 3 });
  assert.equal(res.body.inDemandSkills[0].jobs, 4); assert.equal(res.body.inDemandSkills[0].students, 7);
  assert.equal(res.body.signupsByDay.length, 30);
  assert.equal(h.last('jobPostSkill.groupBy').where.jobPost.removedByAdmin, false);
});
test('analytics with no users returns null verification rate rather than NaN/Infinity', async () => {
  analyticsFixtures(); h.on('user.count', 0);
  const res = await h.invoke(getAnalytics);
  assert.equal(res.body.totals.verification.rate, null);
});
test('signup trend groups near-midnight registrations by Iraq calendar date', t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-23T12:00:00Z') });
  analyticsFixtures(); h.on('user.findMany', [
    { role: 'STUDENT', createdAt: new Date('2026-10-22T21:30:00Z') },
    { role: 'HR', createdAt: new Date('2026-10-22T20:30:00Z') }
  ]);
  return h.invoke(getAnalytics).then(res => {
    assert.equal(res.body.signupsByDay.find(d => d.date === '2026-10-23').students, 1);
    assert.equal(res.body.signupsByDay.find(d => d.date === '2026-10-22').companies, 1);
  });
});
test('pending queue aggregates company and skill approvals', async () => {
  h.on('hRProfile.count', 2); h.on('customSkill.count', 3); h.on('report.count', 4);
  assert.deepEqual((await h.invoke(getPendingCounts)).body, { companies: 2, skills: 3, reports: 4, approvals: 5 });
});
test('public statistics count approved companies and currently open jobs', async () => {
  h.on('studentProfile.count', 10); h.on('hRProfile.count', 2); h.on('jobPost.count', 4);
  assert.deepEqual((await h.invoke(getPublicStats)).body, { studentCount: 10, companyCount: 2, jobCount: 4 });
  assert.deepEqual(h.last('hRProfile.count').where, { status: 'APPROVED' });
  assert.equal(h.last('jobPost.count').where.removedByAdmin, false);
});
test('audit persistence records the actor, target and detail object', async () => {
  h.on('adminAuditLog.create', {});
  await logAdminAction(h.request({ user: { id: 3, email: 'admin@example.test' } }), { action: 'USER_BANNED', targetType: 'USER', targetId: '8', summary: 'Banned disposable user', details: { reason: 'Spam' } });
  assert.deepEqual(h.last('adminAuditLog.create').data, { adminId: 3, adminEmail: 'admin@example.test', action: 'USER_BANNED', targetType: 'USER', targetId: 8, summary: 'Banned disposable user', details: { reason: 'Spam' } });
});
test('audit viewer applies actor/action/target/date filters and pagination', async () => {
  h.on('adminAuditLog.count', 31);
  h.on('adminAuditLog.findMany', q => q.distinct?.[0] === 'action' ? [{ action: 'USER_BANNED' }] : q.distinct ? [{ adminEmail: 'admin@example.test' }] : []);
  const res = await h.invoke(listAudit, { query: { page: '2', action: 'USER_BANNED', admin: 'admin@example.test', targetType: 'USER', targetId: '8', from: '2026-10-01', to: '2026-11-01' } });
  assert.equal(res.body.totalPages, 2); assert.deepEqual(res.body.filters.actions, ['USER_BANNED']);
  const paged = h.calls.find(c => c.operation === 'adminAuditLog.findMany' && c.query.skip !== undefined).query;
  assert.equal(paged.skip, 30); assert.ok(paged.where.AND.some(w => w.targetId === 8));
});
test('rejected instructor profile resubmission returns to pending without accepting privileged fields', async () => {
  h.on('instructorProfile.findUnique', { id: 91, status: 'REJECTED' });
  h.on('instructorProfile.update', q => ({ id: 91, ...q.data }));
  const res = await h.invoke(instructor.updateMyProfile, { user: { id: 4, role: 'INSTRUCTOR' }, body: { fullName: 'Instructor', status: 'APPROVED', userId: 999 } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.resubmitted, true);
  assert.equal(h.last('instructorProfile.update').data.status, 'PENDING');
  assert.deepEqual(h.last('instructorProfile.update').where, { userId: 4 });
});
test('valid setup token chooses a hashed password, consumes the token and returns a session', async () => {
  h.on('accountSetupToken.findUnique', { user: h.user(), expiresAt: new Date(Date.now() + 60000), usedAt: null });
  h.on('user.update', q => h.user(q.data)); h.on('accountSetupToken.update', {});
  const res = await h.invoke(setup.completeSetup, { body: { token: 'test-only-setup-token', password: 'Test-only-password!23' } });
  assert.equal(res.statusCode, 200); assert.ok(res.body.token);
  assert.equal(await bcrypt.compare('Test-only-password!23', h.last('user.update').data.password), true);
  assert.ok(h.last('accountSetupToken.update').data.usedAt instanceof Date);
  assert.equal('password' in res.body.user, false);
});
