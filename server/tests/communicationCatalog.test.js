const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const messages = require('../controllers/messageController');
const reports = require('../controllers/reportController');
const notifications = require('../controllers/notificationController');
const catalog = require('../controllers/admin/catalogController');
const translations = require('../controllers/translationController');
const announcements = require('../controllers/announcementController');
beforeEach(h.reset);
const admin = { id: 3, role: 'ADMIN', email: 'admin@example.test' };
const names = { name_en: 'Python', name_ar: 'بايثون', name_ckb: 'پایتۆن' };

test('messages reject blank content and self-addressed delivery', async () => {
  for (const body of [{ recipientId: 2, content: ' ' }, { recipientId: 1, content: 'Hello' }]) {
    assert.equal((await h.invoke(messages.sendMessage, { body })).statusCode, 400);
  }
});
test('message sender comes from auth and email failure does not lose the in-app message', async () => {
  h.on('user.findUnique', q => h.user({ id: q.where.id })); h.on('message.create', q => ({ id: 121, ...q.data }));
  h.state.emailFailure = true;
  const res = await h.invoke(messages.sendMessage, { body: { recipientId: 2, content: ' Hello ', senderId: 99 } });
  assert.equal(res.statusCode, 201); assert.deepEqual(h.last('message.create').data, { senderId: 1, recipientId: 2, content: 'Hello' });
  await new Promise(resolve => setImmediate(resolve));
});
test('conversation query and read receipts are confined to the current participants', async () => {
  h.on('user.findUnique', h.user({ id: 2 })); h.on('message.findMany', []); h.on('message.updateMany', {});
  const res = await h.invoke(messages.getConversation, { params: { userId: 2 } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(h.last('message.findMany').where.OR, [{ senderId: 1, recipientId: 2 }, { senderId: 2, recipientId: 1 }]);
  assert.deepEqual(h.last('message.updateMany').where, { senderId: 2, recipientId: 1, isRead: false });
});
test('notification reads and updates never change another user notifications', async () => {
  h.on('notification.findMany', []); h.on('notification.count', 0); h.on('notification.updateMany', {});
  await h.invoke(notifications.getMyNotifications);
  assert.deepEqual(h.last('notification.findMany').where, { userId: 1 });
  await h.invoke(notifications.markNotificationsRead, { params: { id: '123' } });
  assert.deepEqual(h.last('notification.updateMany').where, { id: 123, userId: 1 });
  await h.invoke(notifications.markNotificationsRead, { params: { id: 'all' } });
  assert.deepEqual(h.last('notification.updateMany').where, { userId: 1, isRead: false });
});
test('reporting a job stores a snapshot and alerts admins', async () => {
  h.on('report.findFirst', null); h.on('report.count', 0); h.on('jobPost.findUnique', h.job()); h.on('report.create', q => ({ id: 71, ...q.data }));
  const res = await h.invoke(reports.createReport, { body: { targetType: 'JOB', targetId: 21, reason: 'SCAM', details: 'Please investigate' } });
  assert.equal(res.statusCode, 201); assert.equal(h.last('report.create').data.reporterId, 1);
  assert.match(h.last('report.create').data.targetSnapshot, /Test Analyst/); assert.equal(h.notifications[0].type, 'REPORT_FILED');
});
test('duplicate reports are acknowledged without duplicate writes', async () => {
  h.on('report.findFirst', { id: 71 });
  const res = await h.invoke(reports.createReport, { body: { targetType: 'JOB', targetId: 21, reason: 'SPAM' } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.alreadyReported, true); assert.equal(h.last('report.create'), undefined);
});
test('report daily cap blocks flooding', async () => {
  h.on('report.findFirst', null); h.on('report.count', 20);
  assert.equal((await h.invoke(reports.createReport, { body: { targetType: 'JOB', targetId: 21, reason: 'SPAM' } })).statusCode, 429);
});
test('users cannot report themselves or someone else private message', async () => {
  h.on('report.findFirst', null); h.on('report.count', 0);
  assert.equal((await h.invoke(reports.createReport, { body: { targetType: 'USER', targetId: 1, reason: 'SPAM' } })).statusCode, 400);
  h.on('message.findUnique', { recipientId: 99, content: 'Private message' });
  assert.equal((await h.invoke(reports.createReport, { body: { targetType: 'MESSAGE', targetId: 121, reason: 'HARASSMENT' } })).statusCode, 403);
});
for (const missing of ['en', 'ar', 'ckb']) test(`catalog requires ${missing} translation`, async () => {
  assert.equal((await h.invoke(catalog.createSkill, { user: admin, body: { ...names, [`name_${missing}`]: '', categoryId: 1 } })).statusCode, 400);
});
test('catalog rejects NodeJS when Node.js already exists', async () => {
  h.on('category.findUnique', { id: 1 }); h.on('skill.findMany', [{ id: 7, name_en: 'Node.js' }]);
  const res = await h.invoke(catalog.createSkill, { user: admin, body: { ...names, name_en: 'NodeJS', categoryId: 1 } });
  assert.equal(res.statusCode, 409); assert.equal(res.body.existingSkillId, 7);
});
test('catalog skill creation persists all languages and audit record', async () => {
  h.on('category.findUnique', { id: 1 }); h.on('skill.findMany', []); h.on('skill.create', q => ({ id: 7, ...q.data }));
  const res = await h.invoke(catalog.createSkill, { user: admin, body: { ...names, categoryId: 1 } });
  assert.equal(res.statusCode, 201); assert.equal(res.body.name_ckb, names.name_ckb); assert.equal(h.audits[0].action, 'CATALOG_SKILL_CREATED');
});
test('in-use skill and nonempty field deletion require explicit handling', async () => {
  h.on('skill.findUniqueOrThrow', { id: 7, _count: { students: 3, jobPosts: 2 } });
  assert.equal((await h.invoke(catalog.deleteSkill, { user: admin, params: { id: 7 } })).statusCode, 409);
  h.on('category.findUniqueOrThrow', { id: 1, _count: { skills: 3 } });
  assert.equal((await h.invoke(catalog.deleteCategory, { user: admin, params: { id: 1 } })).statusCode, 409);
});
test('catalog merge repoints student/job links and avoids duplicate target memberships', async () => {
  h.on('skill.findUniqueOrThrow', { id: 7, ...names }); h.on('skill.findUnique', { id: 8, ...names });
  h.on('studentSkill.findMany', [{ studentProfileId: 11 }]); h.on('jobPostSkill.findMany', [{ jobPostId: 21 }]);
  h.on('studentSkill.updateMany', { count: 2 }); h.on('jobPostSkill.updateMany', { count: 1 }); h.on('skill.delete', {});
  const res = await h.invoke(catalog.mergeSkill, { user: admin, params: { id: 7 }, body: { intoId: 8 } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.movedStudents, 2);
  assert.deepEqual(h.last('studentSkill.updateMany').where.studentProfileId.notIn, [11]);
  assert.deepEqual(h.last('jobPostSkill.updateMany').where.jobPostId.notIn, [21]);
});
for (const lang of ['en', 'ar', 'ckb']) test(`admin translation edit persists ${lang} and audits before/after`, async () => {
  h.on('translationOverride.findUnique', { value: 'Old' }); h.on('translationOverride.upsert', q => q.create);
  const res = await h.invoke(translations.saveOverride, { user: admin, body: { lang, key: 'home.title', value: 'New' } });
  assert.equal(res.statusCode, 200); assert.equal(h.audits[0].details.before, 'Old'); assert.equal(h.audits[0].details.after, 'New');
});
for (const body of [{ lang: 'fr', key: 'home.title', value: 'Text' }, { lang: 'en', key: 'invalid-key', value: 'Text' },
  { lang: 'en', key: 'home.title', value: '  ' }]) test(`invalid translation update is refused: ${JSON.stringify(body)}`, async () => {
  assert.equal((await h.invoke(translations.saveOverride, { user: admin, body })).statusCode, 400);
});
test('announcement creation supports all languages and records the admin', async () => {
  h.on('announcement.create', q => ({ id: 131, ...q.data }));
  const res = await h.invoke(announcements.create, { user: admin, body: { message_en: 'Welcome', message_ar: 'مرحبا', message_ckb: 'بەخێربێن', type: 'SUCCESS' } });
  assert.equal(res.statusCode, 201); assert.equal(res.body.createdById, 3); assert.equal(h.audits[0].action, 'ANNOUNCEMENT_CREATED');
});
test('announcement dates must be valid and end after the start', async () => {
  for (const body of [{ message_en: '' }, { message_en: 'Notice', startsAt: 'invalid' },
    { message_en: 'Notice', startsAt: '2099-01-02', endsAt: '2099-01-01' }]) {
    assert.equal((await h.invoke(announcements.create, { user: admin, body })).statusCode, 400);
  }
});
