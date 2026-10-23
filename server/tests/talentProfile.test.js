const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const talent = require('../controllers/studentController');
const skills = require('../controllers/skillController');
const cv = require('../utils/cvAccess');
beforeEach(h.reset);

test('profile creation binds to the authenticated user and ignores supplied account IDs', async () => {
  h.on('studentProfile.findUnique', null); h.on('studentProfile.create', q => ({ id: 11, ...q.data }));
  const res = await h.invoke(talent.createStudentProfile, { body: { ...h.profile(), userId: 999, id: 999 } });
  assert.equal(res.statusCode, 201); assert.equal(h.last('studentProfile.create').data.userId, 1);
  assert.equal('id' in h.last('studentProfile.create').data, false);
});
test('second profile creation does not overwrite the first', async () => {
  h.on('studentProfile.findUnique', h.profile());
  assert.equal((await h.invoke(talent.createStudentProfile)).statusCode, 400);
  assert.equal(h.last('studentProfile.create'), undefined);
});
test('profile update preserves ownership and converts the graduation year', async () => {
  h.on('studentProfile.findUnique', h.profile()); h.on('studentProfile.update', q => ({ ...h.profile(), ...q.data }));
  const res = await h.invoke(talent.updateStudentProfile, { body: { fullName: 'Changed', graduationYear: '2028', userId: 999, showEmailToStudents: true } });
  assert.equal(res.statusCode, 200); assert.deepEqual(h.last('studentProfile.update').where, { userId: 1 });
  assert.equal(h.last('studentProfile.update').data.graduationYear, 2028);
  assert.equal(h.last('studentProfile.update').data.showEmailToStudents, true);
});
test('string values cannot silently enable peer email sharing', async () => {
  h.on('studentProfile.findUnique', h.profile()); h.on('studentProfile.update', h.profile());
  await h.invoke(talent.updateStudentProfile, { body: { graduationYear: 2027, showEmailToStudents: 'true' } });
  assert.equal('showEmailToStudents' in h.last('studentProfile.update').data, false);
});
test('private CV path is omitted from both public profile and own-profile responses', async () => {
  h.on('studentProfile.findUnique', h.profile({ resumeUrl: 'resumes/private.pdf' }));
  const own = await h.invoke(talent.getStudentProfile);
  assert.equal(own.body.hasResume, true); assert.equal('resumeUrl' in own.body, false);
  const publicProfile = await h.invoke(talent.getStudentById, { params: { id: 11 }, user: undefined });
  assert.equal('resumeUrl' in publicProfile.body, false); assert.equal('user' in publicProfile.body, false);
});
for (const [role, id, allowed] of [['STUDENT', 1, true], ['STUDENT', 9, false], ['ADMIN', 9, true], ['INSTRUCTOR', 9, false]]) {
  test(`CV policy: ${role} #${id} owner access ${allowed}`, async () => {
    assert.equal(await cv.canViewTalentResume({ role, id }, 1), allowed);
    assert.equal(await cv.canViewApplicationCv({ role, id }, { studentId: 1, jobPost: { hrProfile: { userId: 2 } } }), allowed);
  });
}
test('CV policy rejects guests and missing applications', async () => {
  assert.equal(await cv.canViewTalentResume(null, 1), false); assert.equal(await cv.canViewApplicationCv(null, null), false);
});
test('HR resume access requires a real application to that HR company', async () => {
  h.on('application.findFirst', null); assert.equal(await cv.canViewTalentResume({ id: 2, role: 'HR' }, 1), false);
  h.on('application.findFirst', { id: 44 }); assert.equal(await cv.canViewTalentResume({ id: 2, role: 'HR' }, 1), true);
  assert.deepEqual(h.last('application.findFirst').where, { studentId: 1, jobPost: { hrProfile: { userId: 2 } } });
});
test('owner receives a short-lived signed resume link', async () => {
  h.on('studentProfile.findUnique', { userId: 1, resumeUrl: 'resumes/private.pdf' });
  const res = await h.invoke(talent.getResumeLink, { params: { id: 11 } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.expiresIn, 900);
  assert.equal(h.files[0].operation, 'sign'); assert.match(res.body.url, /token=/);
});
test('unrelated talent cannot distinguish hidden CV from absent CV', async () => {
  h.on('studentProfile.findUnique', { userId: 9, resumeUrl: 'resumes/private.pdf' });
  const denied = await h.invoke(talent.getResumeLink, { params: { id: 11 } });
  h.on('studentProfile.findUnique', null);
  const missing = await h.invoke(talent.getResumeLink, { params: { id: 11 } });
  assert.equal(denied.statusCode, 404); assert.deepEqual(denied.body, missing.body); assert.equal(h.files.length, 0);
});
const file = { buffer: Buffer.from('test document'), mimetype: 'application/pdf', originalname: 'resume.pdf' };
test('resume upload uses private storage and returns only an existence flag', async () => {
  h.on('studentProfile.findUnique', h.profile({ resumeUrl: 'resumes/old.pdf' }));
  h.on('studentProfile.update', q => ({ ...h.profile(), ...q.data }));
  const res = await h.invoke(talent.uploadResume, { file });
  assert.equal(res.statusCode, 200); assert.equal(res.body.hasResume, true); assert.equal('resumeUrl' in res.body, false);
  assert.equal(h.files[0].operation, 'uploadPrivate'); assert.ok(h.last('studentProfile.update').data.resumeUrl.startsWith('resumes/'));
});
test('storage outage leaves the previous CV intact and produces a retryable response', async () => {
  h.on('studentProfile.findUnique', h.profile({ resumeUrl: 'resumes/old.pdf' })); h.state.storageFailure = 'STORAGE_NOT_CONFIGURED';
  const res = await h.invoke(talent.uploadResume, { file });
  assert.equal(res.statusCode, 503); assert.equal(h.last('studentProfile.update'), undefined);
  assert.equal(h.files.some(f => f.operation.startsWith('delete')), false);
});
test('uploads require an existing profile and a file', async () => {
  for (const handler of [talent.uploadResume, talent.uploadProfilePhoto]) {
    assert.equal((await h.invoke(handler)).statusCode, 400);
    h.on('studentProfile.findUnique', null); assert.equal((await h.invoke(handler, { file })).statusCode, 404);
  }
});
test('photo upload binds the generated file to the signed-in profile', async () => {
  h.on('studentProfile.findUnique', h.profile()); h.on('studentProfile.update', q => ({ ...h.profile(), ...q.data }));
  const res = await h.invoke(talent.uploadProfilePhoto, { file: { ...file, mimetype: 'image/jpeg', originalname: 'photo.jpg' } });
  assert.equal(res.statusCode, 200); assert.deepEqual(h.last('studentProfile.update').where, { userId: 1 });
  assert.equal(h.files[0].operation, 'uploadPublic');
});
function skillFixtures(previous = []) {
  h.on('studentProfile.findUnique', h.profile()); h.on('skill.findMany', [{ id: 1, name_en: 'Python' }]);
  h.on('customSkill.findMany', previous); h.on('studentSkill.deleteMany', {}); h.on('customSkill.deleteMany', {});
  h.on('studentSkill.createMany', {}); h.on('customSkill.createMany', {});
}
test('saving skills folds catalog spellings and preserves existing approvals', async () => {
  skillFixtures([{ name: 'IoT', isApproved: true }]);
  const res = await h.invoke(skills.saveStudentSkills, { body: { standardSkills: [], customSkills: ['python', 'IoT', 'New Skill'] } });
  assert.equal(res.statusCode, 200); assert.deepEqual(h.last('studentSkill.createMany').data, [{ studentProfileId: 11, skillId: 1, proficiency: 'Intermediate' }]);
  assert.deepEqual(h.last('customSkill.createMany').data.map(x => [x.name, x.isApproved]), [['IoT', true], ['New Skill', false]]);
  assert.equal(h.notifications.length, 1); assert.equal(h.notifications[0].body, 'New Skill');
});
test('invalid custom skills are rejected before deleting any saved skills', async () => {
  h.on('studentProfile.findUnique', h.profile());
  assert.equal((await h.invoke(skills.saveStudentSkills, { body: { customSkills: ['<script>'] } })).statusCode, 400);
  assert.equal(h.last('studentSkill.deleteMany'), undefined);
});
test('empty skill selection deliberately clears the signed-in profile only', async () => {
  skillFixtures(); const res = await h.invoke(skills.saveStudentSkills, { body: { standardSkills: [], customSkills: [] } });
  assert.equal(res.statusCode, 200); assert.deepEqual(h.last('studentSkill.deleteMany').where, { studentProfileId: 11 });
  assert.deepEqual(h.last('studentSkill.createMany').data, []);
});
