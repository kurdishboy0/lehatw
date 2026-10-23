const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const events = require('../controllers/eventController');
const courses = require('../controllers/courseController');
const lessons = require('../controllers/lessonController');
beforeEach(h.reset);
const admin = { id: 3, role: 'ADMIN', email: 'admin@example.test' };
const instructor = { id: 4, role: 'INSTRUCTOR' };
const event = (overrides = {}) => ({ id: 61, title_en: 'Academic workshop', isPublished: true, isOnline: true,
  onlineUrl: 'https://meeting.example.test/private', startsAt: new Date('2099-01-01'), endsAt: null,
  registrationUrl: null, capacity: 2, _count: { registrations: 1 }, ...overrides });
const course = (overrides = {}) => ({ id: 81, title: 'Data analysis', status: 'APPROVED', instructorProfileId: 91,
  instructor: { id: 91, userId: 4, fullName: 'Test Instructor' }, skills: [{ skill: h.skill(2).skill }],
  _count: { lessons: 2, enrollments: 3 }, lessons: [
    { id: 101, position: 1, title: 'Preview', isPreview: true, content: 'Public preview', videoUrl: 'https://video.example.test/preview' },
    { id: 102, position: 2, title: 'Full lesson', isPreview: false, content: 'Enrolled content', videoUrl: 'https://video.example.test/private', resourceUrl: 'https://files.example.test/private' }
  ], ...overrides });

test('event joining link stays private until registration', async () => {
  h.on('event.findUnique', event());
  const guest = await h.invoke(events.getEvent, { user: undefined, params: { id: 61 } });
  assert.equal(guest.body.onlineUrl, null); assert.equal(guest.body.spotsLeft, 1);
  h.on('eventRegistration.findUnique', { id: 1 });
  const member = await h.invoke(events.getEvent, { params: { id: 61 } });
  assert.equal(member.body.onlineUrl, 'https://meeting.example.test/private');
});
test('unpublished event is hidden from the public', async () => {
  h.on('event.findUnique', event({ isPublished: false }));
  assert.equal((await h.invoke(events.getEvent, { user: undefined, params: { id: 61 } })).statusCode, 404);
});
test('event registration binds to current account and cancellation cannot affect others', async () => {
  h.on('event.findUnique', event()); h.on('eventRegistration.create', {}); h.on('eventRegistration.deleteMany', {});
  assert.equal((await h.invoke(events.register, { params: { id: 61 }, body: { userId: 999 } })).statusCode, 201);
  assert.deepEqual(h.last('eventRegistration.create').data, { eventId: 61, userId: 1 });
  await h.invoke(events.cancelRegistration, { params: { id: 61 } });
  assert.deepEqual(h.last('eventRegistration.deleteMany').where, { eventId: 61, userId: 1 });
});
for (const [name, data, expected] of [
  ['full', { _count: { registrations: 2 } }, 409], ['finished', { startsAt: new Date('2000-01-01') }, 400],
  ['external registration', { registrationUrl: 'https://tickets.example.test' }, 400]
]) test(`${name} event cannot accept an in-app registration`, async () => {
  h.on('event.findUnique', event(data));
  assert.equal((await h.invoke(events.register, { params: { id: 61 } })).statusCode, expected);
  assert.equal(h.last('eventRegistration.create'), undefined);
});
test('repeated event registration is idempotent when capacity remains', async () => {
  h.on('event.findUnique', event()); h.on('eventRegistration.create', () => { throw h.error('P2002'); });
  assert.equal((await h.invoke(events.register, { params: { id: 61 } })).statusCode, 200);
});
for (const body of [{}, { title_en: 'Event', startsAt: 'invalid' },
  { title_en: 'Event', startsAt: '2099-01-01', endsAt: '2098-01-01', isOnline: true },
  { title_en: 'Event', startsAt: '2099-01-01', capacity: -1, isOnline: true }]) {
  test(`event creation validates dates/title/capacity: ${JSON.stringify(body)}`, async () => {
    assert.equal((await h.invoke(events.createEvent, { user: admin, body })).statusCode, 400);
  });
}
test('admin event creation preserves trilingual titles and audits the action', async () => {
  h.on('event.create', q => ({ id: 61, ...q.data }));
  const res = await h.invoke(events.createEvent, { user: admin, body: { title_en: 'Workshop', title_ar: 'ورشة', title_ckb: 'وۆرکشۆپ', startsAt: '2099-01-01', isOnline: true } });
  assert.equal(res.statusCode, 201); assert.equal(res.body.createdById, 3); assert.equal(h.audits[0].action, 'EVENT_CREATED');
});
test('course detail exposes preview only to a guest', async () => {
  h.on('course.findUnique', course());
  const res = await h.invoke(courses.getCourse, { user: undefined, params: { id: 81 } });
  assert.equal(res.statusCode, 200); assert.equal(res.body.lessons[0].content, 'Public preview');
  assert.equal(res.body.lessons[1].locked, true);
  for (const key of ['content', 'videoUrl', 'resourceUrl']) assert.equal(res.body.lessons[1][key], null);
});
test('enrolled talent sees complete lessons and their own progress', async () => {
  h.on('course.findUnique', course()); h.on('courseEnrollment.findUnique', { id: 111, progress: [{ lessonId: 101 }] });
  const res = await h.invoke(courses.getCourse, { params: { id: 81 } });
  assert.equal(res.body.lessons[1].content, 'Enrolled content'); assert.deepEqual(res.body.completedLessonIds, [101]);
  assert.deepEqual(h.last('courseEnrollment.findUnique').where.courseId_userId, { courseId: 81, userId: 1 });
});
test('draft course remains hidden from non-owners', async () => {
  h.on('course.findUnique', course({ status: 'DRAFT' }));
  assert.equal((await h.invoke(courses.getCourse, { user: undefined, params: { id: 81 } })).statusCode, 404);
});
test('blank course skill filter does not turn into nonexistent skill zero', async () => {
  h.on('course.findMany', [course()]);
  const res = await h.invoke(courses.listCourses, { user: undefined, query: { skillIds: '' } });
  assert.equal(res.statusCode, 200); assert.equal(h.last('course.findMany').where.status, 'APPROVED');
  assert.deepEqual(h.last('course.findMany').where.AND, []);
});
test('course enrollment is idempotent and notifies the instructor', async () => {
  h.on('course.findUnique', course()); h.on('courseEnrollment.create', {});
  assert.equal((await h.invoke(courses.enroll, { params: { id: 81 } })).statusCode, 201);
  assert.equal(h.notifications[0].userId, 4);
  h.on('courseEnrollment.create', () => { throw h.error('P2002'); });
  assert.equal((await h.invoke(courses.enroll, { params: { id: 81 } })).statusCode, 200);
});
test('instructor cannot enroll in their own course', async () => {
  h.on('course.findUnique', course());
  assert.equal((await h.invoke(courses.enroll, { user: instructor, params: { id: 81 } })).statusCode, 400);
});
test('pending instructor cannot create a course', async () => {
  h.on('instructorProfile.findUnique', { id: 91, status: 'PENDING' });
  assert.equal((await h.invoke(courses.createCourse, { user: instructor, body: { title: 'Course' } })).statusCode, 403);
});
test('instructor cannot edit someone else course', async () => {
  h.on('instructorProfile.findUnique', { id: 99, status: 'APPROVED' }); h.on('course.findUnique', course());
  assert.equal((await h.invoke(courses.updateCourse, { user: instructor, params: { id: 81 } })).statusCode, 404);
});
test('editing an approved course sends it back for admin review', async () => {
  h.on('instructorProfile.findUnique', { id: 91, status: 'APPROVED' }); h.on('course.findUnique', course());
  h.on('course.update', q => course({ ...q.data, skills: [] }));
  const res = await h.invoke(courses.updateCourse, { user: instructor, params: { id: 81 }, body: { title: 'Edited Course' } });
  assert.equal(res.statusCode, 200); assert.equal(h.last('course.update').data.status, 'PENDING'); assert.equal(res.body.sentForReview, true);
});
test('course submission requires at least one lesson', async () => {
  h.on('instructorProfile.findUnique', { id: 91, status: 'APPROVED' }); h.on('course.findUnique', course({ status: 'DRAFT' }));
  h.on('courseLesson.count', 0);
  assert.equal((await h.invoke(courses.submitCourse, { user: instructor, params: { id: 81 } })).statusCode, 400);
});
test('admin course approval and rejection are audited with reasons', async () => {
  h.on('course.update', q => course(q.data));
  assert.equal((await h.invoke(courses.approveCourse, { user: admin, params: { id: 81 } })).statusCode, 200);
  assert.equal(h.last('course.update').data.status, 'APPROVED');
  assert.equal((await h.invoke(courses.rejectCourse, { user: admin, params: { id: 81 }, body: { reason: 'Needs more practical exercises' } })).statusCode, 200);
  assert.equal(h.last('course.update').data.status, 'REJECTED'); assert.equal(h.audits.length, 2);
});
test('recommended courses teach missing skills, prioritize job demand and exclude enrolled courses', async () => {
  h.on('studentProfile.findUnique', h.profile({ skills: [h.skill(1)] }));
  h.on('jobPost.findMany', [h.job({ id: 21, skills: [h.skill(1), h.skill(2)] }), h.job({ id: 22, skills: [h.skill(2), h.skill(3)] })]);
  h.on('course.findMany', [course({ id: 81 }), course({ id: 82, skills: [{ skill: h.skill(3).skill }] }), course({ id: 83 })]);
  h.on('courseEnrollment.findMany', [{ courseId: 83 }]);
  const res = await h.invoke(courses.recommendedCourses);
  assert.equal(res.statusCode, 200); assert.deepEqual(res.body.recommendations.map(c => c.id), [81, 82]);
  assert.equal(res.body.recommendations[0].jobCount, 2);
  assert.deepEqual(h.last('course.findMany').where.skills.some.skillId.in.sort(), [2, 3]);
});
test('no missing job skills produces an empty course recommendation list', async () => {
  h.on('studentProfile.findUnique', h.profile({ skills: [h.skill(1), h.skill(2)] })); h.on('jobPost.findMany', [h.job()]);
  assert.deepEqual((await h.invoke(courses.recommendedCourses)).body.recommendations, []);
});
test('lesson progress refuses unenrolled talent and wrong-course lessons', async () => {
  h.on('courseLesson.findUnique', { id: 101, courseId: 81 }); h.on('courseEnrollment.findUnique', null);
  assert.equal((await h.invoke(lessons.setLessonProgress, { params: { courseId: 81, lessonId: 101 } })).statusCode, 403);
  assert.equal((await h.invoke(lessons.setLessonProgress, { params: { courseId: 99, lessonId: 101 } })).statusCode, 404);
});
test('completing every lesson marks the enrollment complete; unticking reverses it', async () => {
  h.on('courseLesson.findUnique', { id: 101, courseId: 81 }); h.on('courseEnrollment.findUnique', { id: 111 });
  h.on('lessonProgress.upsert', {}); h.on('lessonProgress.deleteMany', {}); h.on('courseLesson.count', 2);
  h.on('lessonProgress.count', 2); h.on('courseEnrollment.update', {});
  const done = await h.invoke(lessons.setLessonProgress, { params: { courseId: 81, lessonId: 101 }, body: { completed: true } });
  assert.equal(done.body.courseCompleted, true); assert.ok(h.last('courseEnrollment.update').data.completedAt instanceof Date);
  h.on('lessonProgress.count', 1);
  const undone = await h.invoke(lessons.setLessonProgress, { params: { courseId: 81, lessonId: 101 }, body: { completed: false } });
  assert.equal(undone.body.courseCompleted, false); assert.equal(h.last('courseEnrollment.update').data.completedAt, null);
});
