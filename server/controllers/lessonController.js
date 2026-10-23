const prisma = require('../db');
const { notifyAdmins } = require('../utils/notify');

const MAX = { title: 200, content: 20000, url: 500 };
const clean = (value, max) => {
  const s = String(value ?? '').trim();
  return s ? s.slice(0, max) : null;
};

// Loads a course the signed-in instructor owns, for editing its lessons.
async function ownCourse(req, res, courseId) {
  const profile = await prisma.instructorProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
  const course = profile
    ? await prisma.course.findUnique({ where: { id: Number(courseId) }, select: { id: true, instructorProfileId: true, status: true, title: true } })
    : null;
  if (!course || course.instructorProfileId !== profile.id) {
    res.status(404).json({ message: 'Course not found.' });
    return null;
  }
  return course;
}

// Content and its review status must commit together. Owners may still edit
// a draft/pending course; changing approved or rejected content needs review.
async function changeLessons(course, write) {
  const review = ['APPROVED', 'REJECTED'].includes(course.status);
  const result = await prisma.$transaction(async tx => {
    if (review) await tx.course.update({ where: { id: course.id }, data: { status: 'PENDING', rejectionReason: null } });
    return write(tx);
  });
  if (review) notifyAdmins({ type: 'COURSE_PENDING', title: 'A course was edited and needs review',
    body: course.title || 'An instructor updated course lessons.', link: '/admin-dashboard?tab=courses' });
  return result;
}

const listLessons = async (req, res) => {
  try {
    const course = await ownCourse(req, res, req.params.courseId);
    if (!course) return;
    const lessons = await prisma.courseLesson.findMany({ where: { courseId: course.id }, orderBy: { position: 'asc' } });
    res.status(200).json(lessons);
  } catch (error) {
    console.error('List Lessons Error:', error);
    res.status(500).json({ message: 'Server error loading the lessons.' });
  }
};

function readLesson(body) {
  const title = clean(body.title, MAX.title);
  if (!title) return { error: 'Please enter a lesson title.' };
  const durationMinutes = body.durationMinutes === '' || body.durationMinutes === null || body.durationMinutes === undefined ? null : Number(body.durationMinutes);
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 1)) {
    return { error: 'The lesson length in minutes must be a whole number.' };
  }
  return {
    data: {
      title,
      content: clean(body.content, MAX.content),
      videoUrl: clean(body.videoUrl, MAX.url),
      resourceUrl: clean(body.resourceUrl, MAX.url),
      durationMinutes,
      isPreview: body.isPreview === true
    }
  };
}

const createLesson = async (req, res) => {
  try {
    const course = await ownCourse(req, res, req.params.courseId);
    if (!course) return;
    const { data, error } = readLesson(req.body);
    if (error) return res.status(400).json({ message: error });

    const lesson = await changeLessons(course, async tx => {
      const last = await tx.courseLesson.findFirst({ where: { courseId: course.id }, orderBy: { position: 'desc' }, select: { position: true } });
      return tx.courseLesson.create({ data: { ...data, courseId: course.id, position: (last?.position ?? 0) + 1 } });
    });
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Create Lesson Error:', error);
    res.status(500).json({ message: 'Server error saving the lesson.' });
  }
};

const updateLesson = async (req, res) => {
  try {
    const course = await ownCourse(req, res, req.params.courseId);
    if (!course) return;
    const { data, error } = readLesson(req.body);
    if (error) return res.status(400).json({ message: error });
    const existing = await prisma.courseLesson.findFirst({ where: { id: Number(req.params.lessonId), courseId: course.id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: 'Lesson not found.' });

    const lesson = await changeLessons(course, tx => tx.courseLesson.update({ where: { id: existing.id }, data }));
    res.status(200).json(lesson);
  } catch (error) {
    console.error('Update Lesson Error:', error);
    res.status(500).json({ message: 'Server error saving the lesson.' });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const course = await ownCourse(req, res, req.params.courseId);
    if (!course) return;
    const existing = await prisma.courseLesson.findFirst({ where: { id: Number(req.params.lessonId), courseId: course.id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: 'Lesson not found.' });
    await changeLessons(course, tx => tx.courseLesson.delete({ where: { id: existing.id } }));
    res.status(200).json({ message: 'Lesson deleted.' });
  } catch (error) {
    console.error('Delete Lesson Error:', error);
    res.status(500).json({ message: 'Server error deleting the lesson.' });
  }
};

// Saves a new order for the whole course, so an instructor can rearrange
// lessons by moving one up or down.
const reorderLessons = async (req, res) => {
  try {
    const course = await ownCourse(req, res, req.params.courseId);
    if (!course) return;
    const ids = (Array.isArray(req.body.lessonIds) ? req.body.lessonIds : []).map(Number).filter(Number.isInteger);
    const lessons = await prisma.courseLesson.findMany({ where: { courseId: course.id }, select: { id: true } });
    const known = new Set(lessons.map((l) => l.id));
    if (ids.length !== lessons.length || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
      return res.status(400).json({ message: 'Send every lesson of this course, in the new order.' });
    }
    // Always write the rows in the same order (by id), so two reorders sent
    // in quick succession can't deadlock by locking them in opposite orders.
    const updates = ids
      .map((id, index) => ({ id, position: index + 1 }))
      .sort((a, b) => a.id - b.id);
    await changeLessons(course, async tx => {
      for (const { id, position } of updates) await tx.courseLesson.update({ where: { id }, data: { position } });
    });
    res.status(200).json({ message: 'Order saved.' });
  } catch (error) {
    console.error('Reorder Lessons Error:', error);
    res.status(500).json({ message: 'Server error saving the new order.' });
  }
};

// ============ Student progress ============

// Marks a lesson done (or not done again) and reports how far they have got.
const setLessonProgress = async (req, res) => {
  try {
    const lesson = await prisma.courseLesson.findUnique({
      where: { id: Number(req.params.lessonId) },
      select: { id: true, courseId: true }
    });
    if (!lesson || lesson.courseId !== Number(req.params.courseId)) return res.status(404).json({ message: 'Lesson not found.' });

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: lesson.courseId, userId: req.user.id } },
      select: { id: true }
    });
    if (!enrollment) return res.status(403).json({ message: 'Enrol in the course first.' });

    const done = req.body.completed !== false;
    if (done) {
      await prisma.lessonProgress.upsert({
        where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
        create: { enrollmentId: enrollment.id, lessonId: lesson.id },
        update: {}
      });
    } else {
      await prisma.lessonProgress.deleteMany({ where: { enrollmentId: enrollment.id, lessonId: lesson.id } });
    }

    // The course counts as finished once every lesson is ticked off.
    const [total, completed] = await Promise.all([
      prisma.courseLesson.count({ where: { courseId: lesson.courseId } }),
      prisma.lessonProgress.count({ where: { enrollmentId: enrollment.id } })
    ]);
    const finished = total > 0 && completed >= total;
    await prisma.courseEnrollment.update({ where: { id: enrollment.id }, data: { completedAt: finished ? new Date() : null } });

    res.status(200).json({ completed: done, completedLessons: completed, lessonCount: total, courseCompleted: finished });
  } catch (error) {
    console.error('Lesson Progress Error:', error);
    res.status(500).json({ message: 'Server error saving your progress.' });
  }
};

module.exports = { listLessons, createLesson, updateLesson, deleteLesson, reorderLessons, setLessonProgress };
