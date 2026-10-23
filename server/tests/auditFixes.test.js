const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const auth = require('../controllers/authController');
const setup = require('../controllers/accountSetupController');
const lessons = require('../controllers/lessonController');
const jobs = require('../controllers/jobController');
const { readJobInput } = require('../utils/jobInput');
const { isValidPassword } = require('../utils/passwordPolicy');
const { buildSkillVector, sharedCustomSkillNames } = require('../utils/similarity');
const { publicTalentProfile } = require('../utils/talentPrivacy');
beforeEach(h.reset);

test('matching ignores pending and unspecified custom-skill approvals', () => {
  const profile = { customSkills: [{ name: 'Pending', isApproved: false }, { name: 'Unknown' }, { name: 'Approved', isApproved: true }] };
  assert.deepEqual(buildSkillVector(profile), { 'custom:approved': 2 });
  assert.deepEqual(sharedCustomSkillNames(profile, profile), ['Approved']);
});
test('public projection removes user/CV details and pending skills without mutating the source', () => {
  const source = h.profile({ resumeUrl: 'resumes/private.pdf', customSkills: [{ name: 'Approved', isApproved: true }, { name: 'Pending', isApproved: false }] });
  const result = publicTalentProfile(source);
  assert.equal('resumeUrl' in result, false); assert.equal('user' in result, false);
  assert.equal(result.customSkills.length, 1); assert.equal(source.customSkills.length, 2);
});
test('public profile query restricts inactive accounts and responds 404 when one is returned', async () => {
  const controller = require('../controllers/studentController');
  h.on('studentProfile.findUnique', h.profile({ user: h.user({ accountStatus: 'BANNED' }) }));
  assert.equal((await h.invoke(controller.getStudentById, { user: undefined, params: { id: 11 } })).statusCode, 404);
  assert.equal(h.last('studentProfile.findUnique').where.user.accountStatus, 'ACTIVE');
});
for (const value of ['', ' ', 'x'.repeat(201), null, 123]) test(`job title validation rejects ${typeof value} / length ${String(value).length}`, () => {
  assert.throws(() => readJobInput({ title: value }), /job title/);
});
for (const skillIds of ['1,2', [0], [-1], [1.5], [''], [null], [true]]) test(`job input rejects malformed skill selection ${JSON.stringify(skillIds)}`, () => {
  assert.throws(() => readJobInput({ title: 'Valid role', skillIds }), /valid skills/);
});
test('job input trims titles, deduplicates IDs and preserves omitted update fields', () => {
  assert.deepEqual(readJobInput({ title: ' Role ', skillIds: [1, '1', 2] }), { title: 'Role', skillIds: [1, 2] });
  assert.deepEqual(readJobInput({}, { partial: true }), { title: undefined, skillIds: undefined });
});
test('HR cannot edit an existing post to a blank title or malformed skills', async () => {
  h.on('jobPost.findUnique', h.job());
  for (const body of [{ title: ' ' }, { skillIds: [-1] }]) {
    const res = await h.invoke(jobs.updateJobPost, { user: { id: 2, role: 'HR' }, params: { jobId: 21 }, body });
    assert.equal(res.statusCode, 400); assert.equal(h.last('jobPost.update'), undefined);
  }
});
test('password policy counts UTF-8 bytes, including the exact bcrypt boundary', () => {
  assert.ok(isValidPassword('a'.repeat(72))); assert.equal(isValidPassword('a'.repeat(73)), false);
  assert.ok(isValidPassword('ژ'.repeat(36))); assert.equal(isValidPassword('ژ'.repeat(37)), false);
});
test('password setup rejects oversized multibyte passwords before changing the account', async () => {
  h.on('accountSetupToken.findUnique', { user: h.user(), expiresAt: new Date(Date.now() + 60000), usedAt: null });
  assert.equal((await h.invoke(setup.completeSetup, { body: { token: 'test-only', password: 'ژ'.repeat(37) } })).statusCode, 400);
  assert.equal(h.last('user.update'), undefined);
});
test('password reset rejects oversized multibyte passwords before account lookup', async () => {
  assert.equal((await h.invoke(auth.resetPassword, { body: { email: 'talent@example.test', newPassword: 'ژ'.repeat(37) } })).statusCode, 400);
  assert.equal(h.last('user.findFirst'), undefined);
});
function courseFixture(status) {
  h.on('instructorProfile.findUnique', { id: 91 });
  h.on('course.findUnique', { id: 81, title: 'Test Course', instructorProfileId: 91, status });
  h.on('courseLesson.findFirst', { id: 101 }); h.on('courseLesson.update', q => ({ id: 101, ...q.data }));
  h.on('courseLesson.delete', {}); h.on('course.update', {});
}
for (const status of ['APPROVED', 'REJECTED']) {
  for (const action of ['update', 'delete', 'reorder']) test(`${action} lesson on ${status} course returns to review in the same transaction`, async () => {
    courseFixture(status); h.on('courseLesson.findMany', [{ id: 101 }, { id: 102 }]);
    const handler = action === 'update' ? lessons.updateLesson : action === 'delete' ? lessons.deleteLesson : lessons.reorderLessons;
    const res = await h.invoke(handler, { user: { id: 4, role: 'INSTRUCTOR' }, params: { courseId: 81, lessonId: 101 }, body: action === 'reorder' ? { lessonIds: [102, 101] } : { title: 'Updated Lesson' } });
    assert.equal(res.statusCode, 200); assert.deepEqual(h.last('course.update').data, { status: 'PENDING', rejectionReason: null });
    assert.ok(h.calls.some(c => c.operation === '$transaction')); assert.equal(h.notifications[0].type, 'COURSE_PENDING');
    if (action === 'reorder') assert.deepEqual(h.calls.filter(c => c.operation === 'courseLesson.update').map(c => c.query.where.id), [101, 102]);
  });
}
for (const status of ['DRAFT', 'PENDING']) test(`editing lesson in ${status} course does not send duplicate review alerts`, async () => {
  courseFixture(status);
  assert.equal((await h.invoke(lessons.updateLesson, { user: { id: 4, role: 'INSTRUCTOR' }, params: { courseId: 81, lessonId: 101 }, body: { title: 'Updated Lesson' } })).statusCode, 200);
  assert.equal(h.last('course.update'), undefined); assert.equal(h.notifications.length, 0);
});
