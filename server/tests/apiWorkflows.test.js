// Cross-controller journeys through real Express routes, JWTs and bcrypt.
// Prisma persistence and external providers remain process-local doubles.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const { startApi } = require('./helpers/http');
let api;
before(async () => { api = await startApi([
  ['/api/auth', require('../routes/authRoutes')], ['/api/student', require('../routes/studentRoutes')],
  ['/api/skills', require('../routes/skillRoutes')], ['/api/jobs', require('../routes/jobRoutes')],
  ['/api/applications', require('../routes/applicationRoutes')], ['/api/admin', require('../routes/adminRoutes')]
]); });
after(async () => { if (api) await api.close(); });
beforeEach(h.reset);

function identityFixture() {
  let account = null;
  const project = (row, select) => row && select ? Object.fromEntries(Object.keys(select).map(k => [k, row[k]])) : row;
  h.on('user.findFirst', q => account?.email === q.where.email.equals ? { ...account } : null);
  h.on('user.create', q => { account = h.user({ ...q.data, phoneVerified: false }); return project(account, q.select); });
  h.on('user.findUnique', q => q.where.id === 3 ? h.user({ id: 3, role: 'ADMIN', email: 'admin@example.test', isSuperAdmin: true }) : account && q.where.id === account.id ? project(account, q.select) : null);
  h.on('user.update', q => { account = { ...account, ...q.data }; return project(account, q.select); });
  return { get: () => account };
}
async function registerAndVerify(email, role, extra = {}) {
  let res = await api.call('POST', '/api/auth/register', { body: { email, role, password: 'Test-only-password!23', ...extra } });
  assert.equal(res.status, 201);
  res = await api.call('POST', '/api/auth/login', { body: { email, password: 'Test-only-password!23' } });
  assert.equal(res.status, 403, 'New accounts must verify email before login');
  res = await api.call('POST', '/api/auth/send-phone-otp', { body: { email } });
  assert.equal(res.status, 200);
  const code = h.emails.at(-1)[2].match(/\d{6}/)[0];
  res = await api.call('POST', '/api/auth/verify-phone-otp', { body: { email, otp: code } });
  assert.equal(res.status, 200); assert.ok(res.body.token);
  res = await api.call('POST', '/api/auth/login', { body: { email, password: 'Test-only-password!23' } });
  assert.equal(res.status, 200);
  return { user: { id: res.body.user.id, role: res.body.user.role }, headers: { Authorization: `Bearer ${res.body.token}` } };
}
test('HTTP talent journey: signup, email verification, profile, skills, recommendations, application and password reset', async () => {
  identityFixture();
  let profile = null;
  let applications = [];
  h.on('studentProfile.findUnique', () => profile);
  h.on('studentProfile.create', q => { profile = h.profile({ ...q.data, skills: [] }); return profile; });
  h.on('skill.findMany', [{ id: 1, name_en: 'Python' }, { id: 2, name_en: 'SQL' }]);
  h.on('customSkill.findMany', []); h.on('customSkill.deleteMany', {}); h.on('customSkill.createMany', {});
  h.on('studentSkill.deleteMany', () => { profile.skills = []; return {}; });
  h.on('studentSkill.createMany', q => { profile.skills = q.data.map(s => h.skill(s.skillId, s.proficiency)); return { count: q.data.length }; });
  h.on('jobPost.findMany', [h.job({ requiresCv: false })]); h.on('jobPost.findUnique', h.job({ requiresCv: false }));
  h.on('application.findMany', () => applications); h.on('jobInvitation.findMany', []);
  h.on('application.create', q => {
    if (applications.some(a => a.jobPostId === q.data.jobPostId && a.studentId === q.data.studentId)) throw h.error('P2002');
    const app = { id: 41, ...q.data }; applications.push(app); return app;
  });
  const email = 'journey-talent@example.test';
  const session = await registerAndVerify(email, 'STUDENT');
  let res = await api.call('POST', '/api/student/profile', { ...session, body: { fullName: 'Test Talent', university: 'University', fieldOfStudy: 'Biology', graduationYear: 2027 } });
  assert.equal(res.status, 201);
  res = await api.call('POST', '/api/skills/save', { ...session, body: { standardSkills: [{ skillId: 1, proficiency: 'Expert' }], customSkills: [] } });
  assert.equal(res.status, 200);
  res = await api.call('GET', '/api/jobs/matches/mine', session);
  assert.equal(res.status, 200); assert.equal(res.body.matches[21].percent, 50);
  res = await api.call('POST', '/api/applications', { ...session, body: { jobPostId: 21, coverLetter: 'Please consider me.' } });
  assert.equal(res.status, 201); assert.equal('cvUrl' in res.body.application, false);
  assert.equal((await api.call('POST', '/api/applications', { ...session, body: { jobPostId: 21 } })).status, 400);
  res = await api.call('GET', '/api/jobs/matches/mine', session); assert.deepEqual(res.body.appliedJobIds, [21]);
  res = await api.call('POST', '/api/auth/forgot-password', { body: { email } }); assert.equal(res.status, 200);
  const code = h.emails.at(-1)[2].match(/\d{6}/)[0];
  res = await api.call('POST', '/api/auth/reset-password', { body: { email, otp: code, newPassword: 'New-test-password!45' } });
  assert.equal(res.status, 200);
  assert.equal((await api.call('POST', '/api/auth/login', { body: { email, password: 'Test-only-password!23' } })).status, 401);
  assert.equal((await api.call('POST', '/api/auth/login', { body: { email, password: 'New-test-password!45' } })).status, 200);
  assert.equal((await api.call('POST', '/api/auth/reset-password', { body: { email, otp: code, newPassword: 'Replay-test-password!67' } })).status, 400);
  assert.deepEqual(h.unexpected, []);
});
test('HTTP HR/admin journey: company signup, approval, job publishing/editing, moderation and removal', async () => {
  const identity = identityFixture();
  let company, posted;
  h.on('hRProfile.create', q => { company = { id: 31, status: 'PENDING', ...q.data }; return company; });
  h.on('hRProfile.findUnique', () => company);
  h.on('hRProfile.update', q => { company = { ...company, ...q.data, user: { email: identity.get().email } }; return company; });
  h.on('jobPost.create', q => { posted = h.job({ ...q.data, skills: (q.data.skills?.create || []).map(s => h.skill(s.skill.connect.id)), hrProfile: { ...company, userId: 1 } }); return posted; });
  h.on('jobPost.findUnique', () => posted);
  h.on('jobPost.findMany', () => posted ? [posted] : []);
  h.on('jobPost.update', q => { posted = { ...posted, ...q.data, hrProfile: { ...company, userId: 1 } }; return posted; });
  h.on('jobPost.delete', () => { posted = null; return {}; });
  const session = await registerAndVerify('journey-hr@example.test', 'HR', { companyName: 'Test Company' });
  const admin = { user: { id: 3, role: 'ADMIN' } };
  let res = await api.call('POST', '/api/jobs', { ...session, body: { title: 'Research assistant', skillIds: [1] } });
  assert.equal(res.status, 403);
  res = await api.call('PUT', '/api/admin/companies/31/approve', { ...admin, body: {} }); assert.equal(res.status, 200);
  res = await api.call('POST', '/api/jobs', { ...session, body: { title: 'Research assistant', description: 'Assist research', skillIds: [1] } });
  assert.equal(res.status, 201); assert.equal(posted.hrProfileId, 31);
  assert.equal((await api.call('GET', '/api/jobs/mine', session)).body.length, 1);
  res = await api.call('PUT', '/api/jobs/21', { ...session, body: { title: 'Updated research role' } }); assert.equal(res.status, 200);
  res = await api.call('PUT', '/api/admin/jobs/21/remove', { ...admin, body: { reason: 'Moderation workflow test' } }); assert.equal(res.status, 200);
  assert.equal((await api.call('PUT', '/api/jobs/21', { ...session, body: { isActive: true } })).status, 403);
  res = await api.call('PUT', '/api/admin/jobs/21/restore', { ...admin, body: {} }); assert.equal(res.status, 200);
  assert.equal((await api.call('DELETE', '/api/jobs/21', session)).status, 200);
  assert.equal(posted, null); assert.ok(h.audits.some(a => a.action === 'COMPANY_APPROVED'));
  assert.ok(h.audits.some(a => a.action === 'JOB_REMOVED')); assert.deepEqual(h.unexpected, []);
});
