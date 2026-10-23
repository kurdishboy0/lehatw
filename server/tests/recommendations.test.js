const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const recommendations = require('../controllers/recommendationController');
const peers = require('../controllers/matchController');
beforeEach(h.reset);
const company = { id: 2, role: 'HR' };

test('talent recommendations compute skills covered and retain application/invite flags', async () => {
  h.on('studentProfile.findUnique', h.profile({ skills: [h.skill(1), h.skill(3)] }));
  h.on('jobPost.findMany', [h.job(), h.job({ id: 22, skills: [] }), h.job({ id: 23, skills: [h.skill(3)] })]);
  h.on('application.findMany', [{ jobPostId: 21 }]); h.on('jobInvitation.findMany', [{ jobPostId: 23 }]);
  const res = await h.invoke(recommendations.getMyJobMatches);
  assert.equal(res.statusCode, 200); assert.equal(res.body.matches[21].percent, 50);
  assert.equal(res.body.matches[23].percent, 100); assert.equal(res.body.matches[22], undefined);
  assert.deepEqual(res.body.appliedJobIds, [21]); assert.deepEqual(res.body.invitedJobIds, [23]);
  const where = h.last('jobPost.findMany').where;
  assert.equal(where.isActive, true); assert.match(JSON.stringify(where), /applicationDeadline/);
});
test('recommendations report missing profile without querying jobs', async () => {
  h.on('studentProfile.findUnique', null);
  assert.equal((await h.invoke(recommendations.getMyJobMatches)).statusCode, 404);
  assert.equal(h.last('jobPost.findMany'), undefined);
});
test('talent with no skills receive hasSkills false rather than a fictitious match', async () => {
  h.on('studentProfile.findUnique', h.profile({ skills: [] })); h.on('jobPost.findMany', [h.job()]);
  h.on('application.findMany', []); h.on('jobInvitation.findMany', []);
  const res = await h.invoke(recommendations.getMyJobMatches);
  assert.equal(res.body.hasSkills, false); assert.equal(res.body.matches[21].percent, 0);
});
for (const role of ['HR', 'ADMIN', 'INSTRUCTOR']) test(`recommendations refuse non-talent role ${role}`, async () => {
  assert.equal((await h.invoke(recommendations.getMyJobMatches, { user: { id: 2, role } })).statusCode, 403);
});
test('HR candidates rank coverage before proficiency and carry contact/apply flags', async () => {
  h.on('jobPost.findUnique', h.job());
  h.on('studentProfile.findMany', [
    h.profile({ id: 12, user: h.user({ id: 3 }), skills: [h.skill(1, 'Expert')] }),
    h.profile({ id: 13, user: h.user({ id: 4 }), skills: [h.skill(1), h.skill(2)] }),
    h.profile({ id: 14, user: h.user({ id: 5 }), skills: [h.skill(1, 'Beginner')] })
  ]);
  h.on('application.findMany', [{ studentId: 4 }]); h.on('jobInvitation.findMany', [{ studentProfileId: 12, createdAt: '2026-01-01' }]);
  const res = await h.invoke(recommendations.getJobCandidates, { user: company, params: { jobId: 21 } });
  assert.equal(res.statusCode, 200); assert.deepEqual(res.body.candidates.map(p => p.id), [13, 12, 14]);
  assert.ok(res.body.candidates[0].applied); assert.equal(res.body.candidates[1].invitedAt, '2026-01-01');
  assert.equal(res.body.candidates[0].email, 'talent@example.test');
  assert.equal(h.last('studentProfile.findMany').where.user.accountStatus, 'ACTIVE');
  assert.deepEqual(h.last('studentProfile.findMany').include.customSkills.where, { isApproved: true });
});
test('unrelated HR cannot list another company candidates', async () => {
  h.on('jobPost.findUnique', h.job());
  const res = await h.invoke(recommendations.getJobCandidates, { user: { id: 99, role: 'HR' }, params: { jobId: 21 } });
  assert.equal(res.statusCode, 403); assert.equal(h.last('studentProfile.findMany'), undefined);
});
test('job without requirements returns no invented candidates', async () => {
  h.on('jobPost.findUnique', h.job({ skills: [] }));
  const res = await h.invoke(recommendations.getJobCandidates, { user: company, params: { jobId: 21 } });
  assert.deepEqual(res.body.candidates, []);
});
function inviteFixtures() {
  h.on('jobPost.findUnique', h.job()); h.on('studentProfile.findUnique', h.profile());
  h.on('application.findFirst', null); h.on('jobInvitation.create', {}); h.on('message.create', {});
}
test('invitation creates one message and invitation, notifies talent and sends email', async () => {
  inviteFixtures();
  const res = await h.invoke(recommendations.inviteCandidate, { user: company, params: { jobId: 21 }, body: { studentProfileId: 11, message: 'Please apply for our role.' } });
  assert.equal(res.statusCode, 201); assert.deepEqual(h.last('message.create').data, { senderId: 2, recipientId: 1, content: 'Please apply for our role.' });
  assert.ok(h.notifications.some(n => n.type === 'JOB_INVITE' && n.userId === 1));
  assert.equal(h.emails.length, 1); assert.match(h.emails[0][2], /https:\/\/lehatw.example.test\/jobs\/21/);
});
test('invitation refuses already-applied talent without messaging or emailing', async () => {
  inviteFixtures(); h.on('application.findFirst', { id: 44 });
  const res = await h.invoke(recommendations.inviteCandidate, { user: company, params: { jobId: 21 }, body: { studentProfileId: 11, message: 'Please apply' } });
  assert.equal(res.statusCode, 409); assert.equal(h.last('message.create'), undefined); assert.equal(h.emails.length, 0);
});
test('duplicate invitations become conflict responses', async () => {
  inviteFixtures(); h.on('jobInvitation.create', () => { throw h.error('P2002'); });
  const res = await h.invoke(recommendations.inviteCandidate, { user: company, params: { jobId: 21 }, body: { studentProfileId: 11, message: 'Please apply' } });
  assert.equal(res.statusCode, 409); assert.equal(h.emails.length, 0);
});
for (const message of ['', ' ', 'x'.repeat(2001)]) test(`invitation validates message length ${message.length}`, async () => {
  h.on('jobPost.findUnique', h.job());
  assert.equal((await h.invoke(recommendations.inviteCandidate, { user: company, params: { jobId: 21 }, body: { message } })).statusCode, 400);
});
test('expired job cannot invite candidates', async () => {
  h.on('jobPost.findUnique', h.job({ applicationDeadline: new Date('2000-01-01') }));
  assert.equal((await h.invoke(recommendations.inviteCandidate, { user: company, params: { jobId: 21 } })).statusCode, 400);
});
test('peer matches default to hidden email and expose email only after explicit opt-in', async () => {
  h.on('studentProfile.findUnique', h.profile());
  h.on('studentProfile.findMany', [h.profile({ id: 12, userId: 3 }), h.profile({ id: 13, userId: 4, showEmailToStudents: true })]);
  const res = await h.invoke(peers.getSimilarStudents);
  assert.equal(res.statusCode, 200); assert.equal(res.body.matches[0].email, null);
  assert.equal(res.body.matches[1].email, 'talent@example.test');
  assert.equal(h.last('studentProfile.findMany').where.id.not, 11);
  assert.equal(h.last('studentProfile.findMany').where.user.accountStatus, 'ACTIVE');
});
test('peer matching normalizes field text and excludes zero overlap', async () => {
  h.on('studentProfile.findUnique', h.profile({ fieldOfStudy: ' Computer   Science ' }));
  h.on('studentProfile.findMany', [
    h.profile({ id: 12, fieldOfStudy: 'computer science', skills: [] }),
    h.profile({ id: 13, fieldOfStudy: 'History', skills: [] })
  ]);
  const res = await h.invoke(peers.getSimilarStudents);
  assert.equal(res.body.matches.length, 1); assert.equal(res.body.matches[0].similarityScore, 15);
});
test('peer matching caps the ranked list at 30', async () => {
  h.on('studentProfile.findUnique', h.profile());
  h.on('studentProfile.findMany', Array.from({ length: 40 }, (_, i) => h.profile({ id: i + 20 })));
  assert.equal((await h.invoke(peers.getSimilarStudents)).body.matches.length, 30);
});
