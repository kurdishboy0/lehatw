// These expected-behavior regressions originally reproduced the audit issues.
// Keep the assertions enabled after the fixes. See docs/testing.md.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('../helpers/harness');
const { startApi } = require('../helpers/http');
const jobs = require('../../controllers/jobController');
const talent = require('../../controllers/studentController');
const peers = require('../../controllers/matchController');
const search = require('../../controllers/searchController');
const users = require('../../controllers/admin/usersController');
const lessons = require('../../controllers/lessonController');
const auth = require('../../controllers/authController');
const studentRoutes = require('../../routes/studentRoutes');
const { codeSendLimiter } = require('../../middleware/rateLimit');
const { hashOtp } = require('../../utils/otpCodes');
let api;
before(async () => { api = await startApi([['/api/student', studentRoutes]], app => {
  // Trusted test-only IP injection, never installed in the product.
  app.post('/test-send', (req, res, next) => {
    Object.defineProperty(req, 'ip', { value: req.get('x-test-ip'), configurable: true }); next();
  }, codeSendLimiter, (req, res) => res.json({ ok: true }));
}); });
after(async () => { if (api) await api.close(); });
beforeEach(h.reset);

test('[R01] HR job creation must reject a whitespace-only title', async () => {
  h.on('hRProfile.findUnique', h.job().hrProfile); h.on('jobPost.create', q => ({ id: 21, ...q.data }));
  const res = await h.invoke(jobs.createJobPost, { user: { id: 2, role: 'HR' }, body: { title: '   ', description: 'Real description' } });
  assert.equal(res.statusCode, 400, 'HR can currently publish a blank job title; admin creation correctly rejects this');
});
test('[R02] public profile must not expose skills awaiting admin approval', async () => {
  h.on('studentProfile.findUnique', h.profile({ customSkills: [{ id: 51, name: 'Unreviewed skill', isApproved: false }] }));
  const res = await h.invoke(talent.getStudentById, { user: undefined, params: { id: 11 } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.customSkills.some(s => !s.isApproved), false, 'Pending custom skills are currently public');
});
test('[R02] unapproved custom skills must not create peer recommendations', async () => {
  const pending = [{ name: 'Unreviewed skill', isApproved: false }];
  h.on('studentProfile.findUnique', h.profile({ skills: [], customSkills: pending, fieldOfStudy: '' }));
  h.on('studentProfile.findMany', [h.profile({ id: 12, userId: 9, skills: [], customSkills: pending, fieldOfStudy: '' })]);
  const res = await h.invoke(peers.getSimilarStudents);
  assert.deepEqual(res.body.matches, [], 'Unapproved custom skills currently contribute to a peer match');
});
test('[R03] public directory must filter banned/suspended accounts', async () => {
  h.on('studentProfile.count', 0); h.on('studentProfile.findMany', []);
  const res = await h.invoke(talent.getAllStudentsPaginated, { user: undefined });
  assert.equal(res.statusCode, 200);
  assert.equal(h.last('studentProfile.findMany').where?.user?.accountStatus, 'ACTIVE', 'Directory has no active-account predicate');
});
test('[R03] global search must filter banned/suspended talent', async () => {
  h.on('studentProfile.findMany', []); h.on('jobPost.findMany', []);
  await h.invoke(search.search, { user: undefined, query: { q: 'Talent' } });
  assert.equal(h.last('studentProfile.findMany').where.user?.accountStatus, 'ACTIVE', 'Global search has no active-account predicate');
});
test('[R04] public global search must strip stored CV locations', async () => {
  h.on('studentProfile.findMany', [h.profile({ resumeUrl: 'resumes/private-user-cv.pdf' })]); h.on('jobPost.findMany', []);
  const res = await h.invoke(search.search, { user: undefined, query: { q: 'Talent' } });
  assert.equal(res.statusCode, 200);
  assert.equal('resumeUrl' in res.body.students[0], false, 'Search currently returns a private CV storage path');
});
test('[R05] deleting an instructor account must remove its restricting instructor profile', async () => {
  h.on('user.findUnique', h.user({ id: 8, role: 'INSTRUCTOR', instructorProfile: { id: 91 } }));
  h.on('studentProfile.findUnique', null); h.on('application.findMany', []); h.on('message.count', 0);
  h.on('studentProfile.deleteMany', {}); h.on('hRProfile.deleteMany', {});
  let instructorDeleted = false;
  h.on('instructorProfile.deleteMany', () => { instructorDeleted = true; return {}; });
  // Model the existing schema's required InstructorProfile.user foreign key
  // without onDelete: Cascade. This is not a real database transaction test.
  h.on('user.delete', () => { if (!instructorDeleted) throw h.error('P2003'); return {}; });
  const res = await h.invoke(users.deleteUser, { user: { id: 3, role: 'ADMIN', isSuperAdmin: true }, params: { id: 8 },
    body: { reason: 'Delete disposable account', confirmEmail: 'talent@example.test' } });
  assert.equal(res.statusCode, 200, 'InstructorProfile is omitted from the deletion transaction');
});
test('[R06] adding content to an approved course must trigger another admin review', async () => {
  h.on('instructorProfile.findUnique', { id: 91 });
  h.on('course.findUnique', { id: 81, instructorProfileId: 91, status: 'APPROVED' });
  h.on('courseLesson.findFirst', null); h.on('courseLesson.create', q => ({ id: 101, ...q.data }));
  h.on('course.update', {});
  const res = await h.invoke(lessons.createLesson, { user: { id: 4, role: 'INSTRUCTOR' }, params: { courseId: 81 }, body: { title: 'New unreviewed lesson', content: 'New material' } });
  assert.equal(res.statusCode, 201);
  assert.equal(h.last('course.update')?.data.status, 'PENDING', 'Lesson edits bypass the review required for course edits');
});
test('[R07] lesson reordering must reject duplicate IDs instead of losing a lesson position', async () => {
  h.on('instructorProfile.findUnique', { id: 91 }); h.on('course.findUnique', { id: 81, instructorProfileId: 91, status: 'DRAFT' });
  h.on('courseLesson.findMany', [{ id: 101 }, { id: 102 }]); h.on('courseLesson.update', {});
  const res = await h.invoke(lessons.reorderLessons, { user: { id: 4, role: 'INSTRUCTOR' }, params: { courseId: 81 }, body: { lessonIds: [101, 101] } });
  assert.equal(res.statusCode, 400, 'Duplicate IDs pass the current length/membership check');
});
test('[R08] HR account must not create a talent profile through the real HTTP route', async () => {
  h.on('user.findUnique', h.user({ id: 2, role: 'HR' })); h.on('studentProfile.findUnique', null);
  h.on('studentProfile.create', q => ({ id: 11, ...q.data }));
  const res = await api.call('POST', '/api/student/profile', { user: { id: 2, role: 'HR' },
    body: { fullName: 'Company posing as talent', university: 'University', fieldOfStudy: 'History', graduationYear: 2027 } });
  assert.deepEqual(h.unexpected, []); assert.equal(res.status, 403, 'The route verifies login but does not require the STUDENT role');
});
test('[R09] reset password must enforce the same 72-byte bcrypt limit as signup', async () => {
  h.on('user.findFirst', h.user({ resetOtp: hashOtp('123456'), resetOtpExpires: new Date(Date.now() + 60000) }));
  h.on('user.update', {});
  const res = await h.invoke(auth.resetPassword, { body: { email: 'talent@example.test', otp: '123456', newPassword: 'a'.repeat(73) } });
  assert.equal(res.statusCode, 400, 'Reset accepts passwords that bcrypt silently truncates and registration refuses');
});
test('[R10] rotating source addresses must not bypass the same-account code-send allowance', async () => {
  let res;
  for (let n = 1; n <= 6; n++) res = await api.call('POST', '/test-send', {
    body: { email: 'target@example.test' }, headers: { 'x-test-ip': `192.0.2.${n}` }
  });
  assert.equal(res.status, 429, 'A combined IP|email key creates a fresh allowance for each source address');
});

for (const missing of [false, true]) test(`[R11] LinkedIn must reject ${missing ? 'missing' : 'unverified'} provider email before account lookup`, async () => {
  const guardedFetch = global.fetch;
  const provider = missing ? { sub: 'test-linkedin-subject' } : { sub: 'test-linkedin-subject', email: 'talent@example.test', email_verified: false };
  const previousRedirect = process.env.LINKEDIN_REDIRECT_URI;
  delete process.env.LINKEDIN_REDIRECT_URI;
  global.fetch = async url => ({ ok: true, json: async () => String(url).includes('accessToken') ? { access_token: 'test-only-provider-token' } : provider });
  // Prisma 6 omits undefined filter values. For a missing provider email,
  // the current query can therefore return an unrelated existing account.
  h.on('user.findFirst', h.user({ linkedinId: 'existing-linkedin-subject' }));
  try {
    const res = await h.invoke(auth.linkedinLogin, { body: { code: 'test-only-code', redirectUri: 'https://lehato.netlify.app/login' } });
    assert.equal(res.statusCode, 401, 'LinkedIn currently returns a JWT without a verified provider email');
    assert.equal(h.last('user.findFirst'), undefined);
  } finally {
    global.fetch = guardedFetch;
    if (previousRedirect === undefined) delete process.env.LINKEDIN_REDIRECT_URI; else process.env.LINKEDIN_REDIRECT_URI = previousRedirect;
  }
});
