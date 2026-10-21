const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
// These tests stub external services. They never touch a database, upload a
// real document or email anyone.
function stub(path, exports) { require.cache[require.resolve(path)] = { id: require.resolve(path), filename: require.resolve(path), loaded: true, exports }; }
const db = { user: {}, studentProfile: {}, hRProfile: {}, jobPost: {}, application: {} };
const emails = [];
let failEmail = false;
stub('../db', db);
let emailConfigured = true;
stub('../utils/sendEmail', Object.assign(async (...args) => { if (failEmail) throw new Error('Unavailable'); emails.push(args); }, { isConfigured: () => emailConfigured }));
stub('../utils/notify', { notifyUser: () => {}, notifyAdmins: () => {} });
stub('../utils/displayName', { getDisplayName: async () => 'Test talent' });
const auth = require('../controllers/authController');
const jobs = require('../controllers/jobController');
const { applyToJob } = require('../controllers/applicationController');
const { createJobForCompany } = require('../controllers/admin/createController');
const { searchStudents } = require('../controllers/matchController');
const { getContact, updateContact } = require('../controllers/studentContactController');
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
beforeEach(() => {
  emails.length = 0; failEmail = false; emailConfigured = true;
  for (const model of Object.values(db)) for (const key of Object.keys(model)) delete model[key];
});

test('registration rejects malformed email and missing passwords before database writes', async () => {
  for (const body of [{ email: 'wrong', password: 'LongEnough!1' }, { email: 'valid@example.test' }]) {
    const res = response(); await auth.registerUser({ body }, res); assert.equal(res.statusCode, 400);
  }
});
test('unknown account login remains neutral', async () => {
  db.user.findFirst = async () => null;
  const res = response(); await auth.loginUser({ body: { email: 'valid@example.test', password: 'LongEnough!1' } }, res);
  assert.equal(res.statusCode, 401); assert.equal(res.body.message, 'Invalid credentials!');
});
test('email verification is required even without a contact phone', async () => {
  db.user.findFirst = async () => ({ id: 1, email: 'valid@example.test', password: bcrypt.hashSync('LongEnough!1', 4), phone: null, phoneVerified: false });
  const res = response(); await auth.loginUser({ body: { email: 'valid@example.test', password: 'LongEnough!1' } }, res);
  assert.equal(res.statusCode, 403); assert.equal(res.body.code, 'PHONE_NOT_VERIFIED');
});
test('verification sends email without requiring a phone and stores only a hashed code', async () => {
  db.user.findFirst = async () => ({ id: 1, email: 'valid@example.test', phone: null, phoneVerified: false });
  let stored;
  db.user.update = async (query) => { stored = query.data; return {}; };
  const res = response(); await auth.sendPhoneOtp({ body: { email: ' VALID@example.test ', channel: 'sms' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(emails.length, 1);
  const otp = emails[0][2].match(/\d{6}/)[0];
  assert.notEqual(stored.phoneOtp, otp); assert.ok(stored.phoneOtpExpires > new Date());
});
test('delivery failure returns an explicit retryable response, not success', async () => {
  db.user.findFirst = async () => ({ id: 1, email: 'valid@example.test', phoneVerified: false });
  db.user.update = async () => ({}); failEmail = true;
  const res = response(); await auth.sendPhoneOtp({ body: { email: 'valid@example.test' } }, res);
  assert.equal(res.statusCode, 503); assert.equal(res.body.code, 'EMAIL_DELIVERY_UNAVAILABLE');
});
test('forgot password does not disclose whether an account exists', async () => {
  const outputs = [];
  for (const user of [null, { id: 1, email: 'valid@example.test' }]) {
    db.user.findFirst = async () => user; db.user.update = async () => ({});
    const res = response(); await auth.forgotPassword({ body: { email: 'valid@example.test' } }, res);
    outputs.push({ code: res.statusCode, body: res.body });
  }
  assert.deepEqual(outputs[0], outputs[1]);
});
test('unconfigured password-reset mail reports service unavailability without looking up accounts', async () => {
  emailConfigured = false;
  db.user.findFirst = async () => assert.fail('availability must not depend on whether an account exists');
  const res = response(); await auth.forgotPassword({ body: { email: 'valid@example.test' } }, res);
  assert.equal(res.statusCode, 503); assert.equal(res.body.code, 'EMAIL_DELIVERY_UNAVAILABLE');
});
test('expired jobs reject applications before CV upload or application writes', async () => {
  db.jobPost.findUnique = async () => ({ id: 1, isActive: true, applicationDeadline: new Date('2000-01-01'), hrProfile: {} });
  db.application.create = async () => { assert.fail('application must not be written'); };
  const res = response(); await applyToJob({ user: { id: 1, role: 'STUDENT' }, body: { jobPostId: 1 }, file: { buffer: Buffer.from('test') } }, res);
  assert.equal(res.statusCode, 400); assert.equal(res.body.code, 'APPLICATIONS_CLOSED');
});
test('company job creation persists the chosen deadline in UTC', async () => {
  db.hRProfile.findUnique = async () => ({ id: 2, status: 'APPROVED' });
  let data; db.jobPost.create = async (query) => { data = query.data; return { id: 3 }; };
  const res = response(); await jobs.createJobPost({ user: { id: 1, role: 'HR' }, body: { title: 'Role', applicationDeadline: '2099-01-01' } }, res);
  assert.equal(res.statusCode, 201); assert.equal(data.applicationDeadline.toISOString(), '2099-01-01T21:00:00.000Z');
});
test('company and admin reject invalid deadlines before writes', async () => {
  db.hRProfile.findUnique = async () => ({ id: 2, status: 'APPROVED' });
  db.jobPost.create = async () => { assert.fail('invalid job must not be written'); };
  for (const handler of [jobs.createJobPost, createJobForCompany]) {
    const res = response(); await handler({ user: { id: 1, role: 'HR' }, body: { title: 'Role', hrProfileId: 2, applicationDeadline: '2026-02-30' } }, res);
    assert.equal(res.statusCode, 400); assert.equal(res.body.code, 'INVALID_APPLICATION_DEADLINE');
  }
});
test('Other field filter searches actual field text without the taxonomy constraint', async () => {
  let where;
  db.studentProfile.count = async (query) => { where = query.where; return 0; };
  db.studentProfile.findMany = async () => [];
  const res = response(); await searchStudents({ query: { page: '-1', subjectAreaId: '1', fieldOfStudy: 'Quantum biology' } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.currentPage, 1);
  assert.deepEqual(where.AND, [{ fieldOfStudy: { contains: 'Quantum biology', mode: 'insensitive' } }]);
});

test('contact editing updates only the signed-in talent phone and never verification', async () => {
  let update;
  db.user.update = async query => { update = query; return {}; };
  const res = response();
  await updateContact({ user: { id: 91, role: 'STUDENT' }, body: { userId: 123, phone: '(0750) 1234567', phoneVerified: true } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(update, { where: { id: 91 }, data: { phone: '07501234567' } });
});
test('other roles cannot use talent contact endpoints', async () => {
  for (const role of ['HR', 'ADMIN', 'INSTRUCTOR']) {
    const req = { user: { id: 91, role }, body: { phone: '07501234567' } };
    for (const handler of [getContact, updateContact]) {
      const res = response(); await handler(req, res); assert.equal(res.statusCode, 403);
    }
  }
});
test('an open job accepts an application while keeping the stored CV path private', async () => {
  db.jobPost.findUnique = async () => ({ id: 1, isActive: true, requiresCv: true, applicationDeadline: new Date('2099-01-01'), title: 'Role', hrProfile: { userId: 4, companyName: 'Test' } });
  db.studentProfile.findUnique = async () => ({ resumeUrl: 'resumes/private-path.pdf' });
  db.application.create = async query => ({ id: 10, ...query.data });
  const res = response(); await applyToJob({ user: { id: 91, role: 'STUDENT' }, body: { jobPostId: 1 } }, res);
  assert.equal(res.statusCode, 201); assert.equal(res.body.application.hasCv, true);
  assert.equal('cvUrl' in res.body.application, false);
});
test('required CV and duplicate-application checks still reject submissions', async () => {
  db.jobPost.findUnique = async () => ({ id: 1, isActive: true, requiresCv: true, hrProfile: {} });
  db.studentProfile.findUnique = async () => null;
  let res = response(); await applyToJob({ user: { id: 91, role: 'STUDENT' }, body: { jobPostId: 1 } }, res);
  assert.equal(res.statusCode, 400); assert.match(res.body.message, /requires a CV/);
  db.studentProfile.findUnique = async () => ({ resumeUrl: 'resumes/private.pdf' });
  db.application.create = async () => { throw Object.assign(new Error(), { code: 'P2002' }); };
  res = response(); await applyToJob({ user: { id: 91, role: 'STUDENT' }, body: { jobPostId: 1 } }, res);
  assert.equal(res.statusCode, 400); assert.match(res.body.message, /already applied/);
});
