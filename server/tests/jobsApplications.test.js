const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const jobs = require('../controllers/jobController');
const applications = require('../controllers/applicationController');
const hr = require('../controllers/hrController');
const admin = require('../controllers/admin/createController');
beforeEach(h.reset);
const company = { id: 2, role: 'HR' };
const adminUser = { id: 3, email: 'admin@example.test', role: 'ADMIN' };

for (const role of ['STUDENT', 'INSTRUCTOR', 'ADMIN']) test(`job creation refuses ${role}`, async () => {
  assert.equal((await h.invoke(jobs.createJobPost, { user: { id: 1, role }, body: { title: 'Role' } })).statusCode, 403);
  assert.equal(h.calls.length, 0);
});
for (const status of ['PENDING', 'REJECTED']) test(`${status} company cannot publish a job`, async () => {
  h.on('hRProfile.findUnique', { id: 31, status });
  assert.equal((await h.invoke(jobs.createJobPost, { user: company, body: { title: 'Role' } })).statusCode, 403);
  assert.equal(h.last('jobPost.create'), undefined);
});
test('approved company creates its own job with catalog requirements and optional CV', async () => {
  h.on('hRProfile.findUnique', h.job().hrProfile); h.on('jobPost.create', q => ({ id: 21, ...q.data }));
  const res = await h.invoke(jobs.createJobPost, { user: company,
    body: { title: 'Data analyst', description: 'Analyse reports', skillIds: [1, '2'], requiresCv: false, hrProfileId: 999, location: 'Erbil' } });
  assert.equal(res.statusCode, 201); const data = h.last('jobPost.create').data;
  assert.equal(data.hrProfileId, 31); assert.equal(data.requiresCv, false);
  assert.deepEqual(data.skills.create.map(s => s.skill.connect.id), [1, 2]);
});
test('job management never edits or deletes another HR job', async () => {
  h.on('jobPost.findUnique', h.job());
  for (const handler of [jobs.updateJobPost, jobs.deleteJobPost, jobs.getMatchingStudents]) {
    assert.equal((await h.invoke(handler, { user: { id: 99, role: 'HR' }, params: { jobId: 21 } })).statusCode, 403);
  }
  assert.equal(h.last('jobPost.update'), undefined); assert.equal(h.last('jobPost.delete'), undefined);
});
test('owning company may edit a title and delete its job', async () => {
  h.on('jobPost.findUnique', h.job()); h.on('jobPost.update', q => ({ ...h.job(), ...q.data })); h.on('jobPost.delete', {});
  assert.equal((await h.invoke(jobs.updateJobPost, { user: company, params: { jobId: 21 }, body: { title: 'Updated title' } })).statusCode, 200);
  assert.equal(h.last('jobPost.update').data.title, 'Updated title');
  assert.equal((await h.invoke(jobs.deleteJobPost, { user: company, params: { jobId: 21 } })).statusCode, 200);
  assert.deepEqual(h.last('jobPost.delete').where, { id: 21 });
});
test('admin removal cannot be overridden by the HR reactivation control', async () => {
  h.on('jobPost.findUnique', h.job({ removedByAdmin: true, isActive: false }));
  assert.equal((await h.invoke(jobs.updateJobPost, { user: company, params: { jobId: 21 }, body: { isActive: true } })).statusCode, 403);
});
test('my-jobs list is constrained to the signed-in company', async () => {
  h.on('hRProfile.findUnique', { id: 31 }); h.on('jobPost.findMany', []);
  assert.equal((await h.invoke(jobs.getMyJobs, { user: company })).statusCode, 200);
  assert.deepEqual(h.last('jobPost.findMany').where, { hrProfileId: 31 });
});
test('rejected HR resubmission returns to pending, never directly approved', async () => {
  h.on('hRProfile.findUnique', { id: 31, status: 'REJECTED' });
  h.on('hRProfile.update', q => ({ id: 31, ...q.data }));
  const res = await h.invoke(hr.updateHRProfile, { user: company, body: { companyName: 'Corrected Company', status: 'APPROVED' } });
  assert.equal(res.statusCode, 200); assert.ok(res.body.resubmitted);
  assert.equal(h.last('hRProfile.update').data.status, 'PENDING'); assert.equal(h.last('hRProfile.update').data.rejectionReason, null);
  assert.ok(h.notifications.some(n => n.admins));
});
test('HR profile update cannot approve its own pending company', async () => {
  h.on('hRProfile.findUnique', { id: 31, status: 'PENDING' }); h.on('hRProfile.update', {});
  await h.invoke(hr.updateHRProfile, { user: company, body: { status: 'APPROVED', userId: 999 } });
  assert.equal('status' in h.last('hRProfile.update').data, false); assert.deepEqual(h.last('hRProfile.update').where, { userId: 2 });
});
for (const role of ['HR', 'ADMIN', 'INSTRUCTOR']) test(`application refuses ${role}`, async () => {
  assert.equal((await h.invoke(applications.applyToJob, { user: { id: 1, role }, body: { jobPostId: 21 } })).statusCode, 403);
});
test('talent can apply with a saved CV and only safe fields are returned', async () => {
  h.on('jobPost.findUnique', h.job()); h.on('studentProfile.findUnique', h.profile({ resumeUrl: 'resumes/saved.pdf' }));
  h.on('application.create', q => ({ id: 41, ...q.data }));
  const res = await h.invoke(applications.applyToJob, { body: { jobPostId: 21, coverLetter: 'My application', studentId: 999 } });
  assert.equal(res.statusCode, 201); assert.equal(h.last('application.create').data.studentId, 1);
  assert.equal(h.last('application.create').data.cvUrl, 'resumes/saved.pdf'); assert.equal('cvUrl' in res.body.application, false);
  assert.equal(res.body.application.hasCv, true); assert.equal(h.notifications.length, 2);
});
test('an uploaded application CV takes precedence over the saved CV', async () => {
  h.on('jobPost.findUnique', h.job()); h.on('application.create', q => ({ id: 41, ...q.data }));
  const res = await h.invoke(applications.applyToJob, { body: { jobPostId: 21 },
    file: { buffer: Buffer.from('CV'), mimetype: 'application/pdf', originalname: 'cv.pdf' } });
  assert.equal(res.statusCode, 201); assert.equal(h.files[0].operation, 'uploadPrivate');
  assert.equal(h.last('studentProfile.findUnique'), undefined);
});
test('CV-optional job accepts a talent without a saved CV', async () => {
  h.on('jobPost.findUnique', h.job({ requiresCv: false })); h.on('studentProfile.findUnique', null);
  h.on('application.create', q => ({ id: 41, ...q.data }));
  const res = await h.invoke(applications.applyToJob, { body: { jobPostId: 21 } });
  assert.equal(res.statusCode, 201); assert.equal(res.body.application.hasCv, false);
});
for (const job of [null, h.job({ isActive: false })]) test(`missing/inactive job ${Boolean(job)} refuses applications`, async () => {
  h.on('jobPost.findUnique', job);
  assert.equal((await h.invoke(applications.applyToJob, { body: { jobPostId: 21 } })).statusCode, 404);
  assert.equal(h.last('application.create'), undefined);
});
test('application history returns only the signed-in user applications without CV paths', async () => {
  h.on('application.findMany', [{ id: 41, cvUrl: 'resumes/private.pdf' }]);
  const res = await h.invoke(applications.getMyApplications);
  assert.deepEqual(h.last('application.findMany').where, { studentId: 1 }); assert.equal('cvUrl' in res.body[0], false);
});
test('only the owning company may open its applicant list', async () => {
  h.on('jobPost.findUnique', h.job()); h.on('application.findMany', [{ id: 41, cvUrl: 'resumes/private.pdf' }]);
  assert.equal((await h.invoke(applications.getJobApplicants, { user: { id: 99, role: 'HR' }, params: { jobId: 21 } })).statusCode, 403);
  const res = await h.invoke(applications.getJobApplicants, { user: company, params: { jobId: 21 } });
  assert.equal(res.statusCode, 200); assert.equal('cvUrl' in res.body.applications[0], false);
});
for (const [role, id, expected] of [['STUDENT', 1, 200], ['HR', 2, 200], ['ADMIN', 3, 200], ['HR', 99, 404], ['STUDENT', 99, 404]]) {
  test(`application CV: ${role} #${id} gets ${expected}`, async () => {
    h.on('application.findUnique', { studentId: 1, cvUrl: 'resumes/app.pdf', jobPost: { hrProfile: { userId: 2 } } });
    const res = await h.invoke(applications.getApplicationCvLink, { user: { role, id }, params: { id: 41 } });
    assert.equal(res.statusCode, expected); assert.equal(h.files.length, expected === 200 ? 1 : 0);
  });
}
test('admin can post on behalf of an approved company and audit the action', async () => {
  h.on('hRProfile.findUnique', h.job().hrProfile); h.on('jobPost.create', q => ({ id: 21, ...q.data }));
  const res = await h.invoke(admin.createJobForCompany, { user: adminUser, body: { title: ' Admin Role ', hrProfileId: 31, skillIds: [1, 2] } });
  assert.equal(res.statusCode, 201); assert.equal(h.last('jobPost.create').data.hrProfileId, 31);
  assert.equal(h.audits[0].action, 'JOB_CREATED'); assert.equal(h.notifications[0].userId, 2);
});
test('admin job creation rejects blank titles and unapproved companies', async () => {
  h.on('hRProfile.findUnique', h.job().hrProfile);
  assert.equal((await h.invoke(admin.createJobForCompany, { user: adminUser, body: { title: '   ', hrProfileId: 31 } })).statusCode, 400);
  h.on('hRProfile.findUnique', { id: 31, status: 'PENDING' });
  assert.equal((await h.invoke(admin.createJobForCompany, { user: adminUser, body: { title: 'Role', hrProfileId: 31 } })).statusCode, 400);
});
