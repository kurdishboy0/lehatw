const prisma = require('../db');
const { notifyUser, notifyAdmins } = require('../utils/notify');
const { logAdminAction } = require('../utils/audit');

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];
const LANGUAGES = ['ENGLISH', 'ARABIC', 'KURDISH', 'MIXED'];
const DELIVERIES = ['ONLINE', 'IN_PERSON', 'HYBRID'];
const MAX = { title: 200, summary: 300, description: 8000, location: 200, url: 500 };

const clean = (value, max) => {
  const s = String(value ?? '').trim();
  return s ? s.slice(0, max) : null;
};

const COURSE_CARD = {
  id: true, title: true, summary: true, level: true, language: true, delivery: true,
  location: true, priceIqd: true, durationHours: true, startsAt: true, coverImageUrl: true,
  status: true, publishedAt: true,
  instructor: { select: { id: true, fullName: true, headline: true, photoUrl: true } },
  skills: { select: { skill: { select: { id: true, name_en: true, name_ar: true, name_ckb: true } } } },
  _count: { select: { lessons: true, enrollments: true } }
};

const shapeCard = (course) => {
  const { _count, skills, ...rest } = course;
  return { ...rest, skills: skills.map((s) => s.skill), lessonCount: _count.lessons, studentCount: _count.enrollments };
};

// The instructor profile of the signed-in user, if they may teach.
async function approvedInstructor(req, res) {
  const profile = await prisma.instructorProfile.findUnique({ where: { userId: req.user.id }, select: { id: true, status: true, fullName: true } });
  if (!profile) {
    res.status(403).json({ message: 'Only instructors can do this.' });
    return null;
  }
  if (profile.status !== 'APPROVED') {
    res.status(403).json({ message: 'An admin has to approve your instructor account first.' });
    return null;
  }
  return profile;
}

function readCourse(body) {
  const title = clean(body.title, MAX.title);
  if (!title) return { error: 'Please enter a course title.' };
  const price = body.priceIqd === '' || body.priceIqd === null || body.priceIqd === undefined ? 0 : Number(body.priceIqd);
  if (!Number.isInteger(price) || price < 0) return { error: 'The price must be a whole number, or 0 for a free course.' };
  const durationHours = body.durationHours === '' || body.durationHours === null || body.durationHours === undefined ? null : Number(body.durationHours);
  if (durationHours !== null && (!Number.isInteger(durationHours) || durationHours < 1)) return { error: 'The length in hours must be a whole number.' };
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: 'That start date is not valid.' };

  const delivery = DELIVERIES.includes(body.delivery) ? body.delivery : 'ONLINE';
  const location = clean(body.location, MAX.location);
  if (delivery !== 'ONLINE' && !location) return { error: 'Add where the course takes place, or make it online.' };

  return {
    data: {
      title,
      summary: clean(body.summary, MAX.summary),
      description: clean(body.description, MAX.description),
      level: LEVELS.includes(body.level) ? body.level : 'ALL_LEVELS',
      language: LANGUAGES.includes(body.language) ? body.language : 'ENGLISH',
      delivery,
      location: delivery === 'ONLINE' ? null : location,
      priceIqd: price,
      durationHours,
      startsAt,
      externalUrl: clean(body.externalUrl, MAX.url),
      coverImageUrl: clean(body.coverImageUrl, MAX.url)
    },
    skillIds: (Array.isArray(body.skillIds) ? body.skillIds : []).map(Number).filter(Number.isInteger)
  };
}

// ============ Public ============

// Approved courses, newest first, with simple filters.
const listCourses = async (req, res) => {
  try {
    const where = { status: 'APPROVED', AND: [] };
    const q = (req.query.q || '').trim();
    if (q) {
      where.AND.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { instructor: { fullName: { contains: q, mode: 'insensitive' } } }
        ]
      });
    }
    if (LEVELS.includes(req.query.level)) where.AND.push({ level: req.query.level });
    if (LANGUAGES.includes(req.query.language)) where.AND.push({ language: req.query.language });
    if (DELIVERIES.includes(req.query.delivery)) where.AND.push({ delivery: req.query.delivery });
    if (req.query.free === '1') where.AND.push({ priceIqd: 0 });
    // Split first, then drop the blanks: Number('') is 0, which would filter
    // for a skill that doesn't exist and hide every course.
    const skillIds = (req.query.skillIds || '').split(',').filter((part) => part.trim()).map(Number).filter(Number.isInteger);
    if (skillIds.length) where.AND.push({ skills: { some: { skillId: { in: skillIds } } } });

    const courses = await prisma.course.findMany({ where, orderBy: { publishedAt: 'desc' }, take: 100, select: COURSE_CARD });
    const enrolled = req.user
      ? new Set((await prisma.courseEnrollment.findMany({ where: { userId: req.user.id }, select: { courseId: true } })).map((e) => e.courseId))
      : new Set();
    res.status(200).json(courses.map((c) => ({ ...shapeCard(c), enrolled: enrolled.has(c.id) })));
  } catch (error) {
    console.error('List Courses Error:', error);
    res.status(500).json({ message: 'Server error loading courses.' });
  }
};

// One course. Lesson text is only included for people who enrolled (or for
// the instructor and admins); everyone else sees titles and the free previews.
const getCourse = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        instructor: { select: { id: true, userId: true, fullName: true, headline: true, bio: true, photoUrl: true, website: true, linkedinUrl: true } },
        skills: { select: { skill: { select: { id: true, name_en: true, name_ar: true, name_ckb: true } } } },
        lessons: { orderBy: { position: 'asc' } },
        _count: { select: { enrollments: true } }
      }
    });
    if (!course) return res.status(404).json({ message: 'Course not found.' });

    const isOwner = req.user && course.instructor.userId === req.user.id;
    const isAdmin = req.user?.role === 'ADMIN';
    if (course.status !== 'APPROVED' && !isOwner && !isAdmin) return res.status(404).json({ message: 'Course not found.' });

    const enrollment = req.user
      ? await prisma.courseEnrollment.findUnique({
        where: { courseId_userId: { courseId: course.id, userId: req.user.id } },
        include: { progress: { select: { lessonId: true } } }
      })
      : null;
    const fullAccess = Boolean(enrollment) || isOwner || isAdmin;

    const { _count, skills, lessons, instructor, ...rest } = course;
    res.status(200).json({
      ...rest,
      instructor: { id: instructor.id, userId: instructor.userId, fullName: instructor.fullName, headline: instructor.headline, bio: instructor.bio, photoUrl: instructor.photoUrl, website: instructor.website, linkedinUrl: instructor.linkedinUrl },
      skills: skills.map((s) => s.skill),
      studentCount: _count.enrollments,
      enrolled: Boolean(enrollment),
      completedLessonIds: enrollment ? enrollment.progress.map((p) => p.lessonId) : [],
      lessons: lessons.map((l) => ({
        id: l.id,
        position: l.position,
        title: l.title,
        durationMinutes: l.durationMinutes,
        isPreview: l.isPreview,
        locked: !(fullAccess || l.isPreview),
        content: fullAccess || l.isPreview ? l.content : null,
        videoUrl: fullAccess || l.isPreview ? l.videoUrl : null,
        resourceUrl: fullAccess || l.isPreview ? l.resourceUrl : null
      }))
    });
  } catch (error) {
    console.error('Get Course Error:', error);
    res.status(500).json({ message: 'Server error loading the course.' });
  }
};

const enroll = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: Number(req.params.id) }, select: { id: true, status: true, title: true, instructor: { select: { userId: true, fullName: true } } } });
    if (!course || course.status !== 'APPROVED') return res.status(404).json({ message: 'Course not found.' });
    if (course.instructor.userId === req.user.id) return res.status(400).json({ message: "You can't enrol in your own course." });

    try {
      await prisma.courseEnrollment.create({ data: { courseId: course.id, userId: req.user.id } });
    } catch (error) {
      if (error.code === 'P2002') return res.status(200).json({ message: 'You are already enrolled.', enrolled: true });
      throw error;
    }
    notifyUser(course.instructor.userId, {
      type: 'COURSE_ENROLLMENT', title: 'A student enrolled in your course',
      body: course.title, link: `/courses/${course.id}`
    });
    res.status(201).json({ message: 'You are enrolled.', enrolled: true });
  } catch (error) {
    console.error('Enroll Error:', error);
    res.status(500).json({ message: 'Server error enrolling you.' });
  }
};

const unenroll = async (req, res) => {
  try {
    await prisma.courseEnrollment.deleteMany({ where: { courseId: Number(req.params.id), userId: req.user.id } });
    res.status(200).json({ message: 'You left the course.', enrolled: false });
  } catch (error) {
    console.error('Unenroll Error:', error);
    res.status(500).json({ message: 'Server error leaving the course.' });
  }
};

// The courses this student enrolled in, with how far they have got.
const myCourses = async (req, res) => {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { course: { select: COURSE_CARD }, progress: { select: { lessonId: true } } }
    });
    res.status(200).json(enrollments.map((e) => ({
      ...shapeCard(e.course),
      enrolled: true,
      enrolledAt: e.createdAt,
      completedAt: e.completedAt,
      completedLessons: e.progress.length
    })));
  } catch (error) {
    console.error('My Courses Error:', error);
    res.status(500).json({ message: 'Server error loading your courses.' });
  }
};

// ============ Instructor ============

const listMyCourses = async (req, res) => {
  try {
    const profile = await prisma.instructorProfile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
    if (!profile) return res.status(403).json({ message: 'Only instructors can do this.' });
    const courses = await prisma.course.findMany({
      where: { instructorProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: { ...COURSE_CARD, rejectionReason: true }
    });
    res.status(200).json(courses.map(shapeCard));
  } catch (error) {
    console.error('List My Courses Error:', error);
    res.status(500).json({ message: 'Server error loading your courses.' });
  }
};

const createCourse = async (req, res) => {
  try {
    const profile = await approvedInstructor(req, res);
    if (!profile) return;
    const { data, skillIds, error } = readCourse(req.body);
    if (error) return res.status(400).json({ message: error });

    const course = await prisma.course.create({
      data: { ...data, instructorProfileId: profile.id, skills: { create: skillIds.map((id) => ({ skill: { connect: { id } } })) } },
      select: COURSE_CARD
    });
    res.status(201).json(shapeCard(course));
  } catch (error) {
    console.error('Create Course Error:', error);
    res.status(500).json({ message: 'Server error saving the course.' });
  }
};

// Loads a course the signed-in instructor owns.
async function ownCourse(req, res) {
  const profile = await prisma.instructorProfile.findUnique({ where: { userId: req.user.id }, select: { id: true, status: true, fullName: true } });
  const course = profile
    ? await prisma.course.findUnique({ where: { id: Number(req.params.id) }, select: { id: true, instructorProfileId: true, status: true, title: true } })
    : null;
  if (!course || course.instructorProfileId !== profile.id) {
    res.status(404).json({ message: 'Course not found.' });
    return null;
  }
  return { course, profile };
}

// Editing an approved or rejected course sends it back for review, so
// students never see changes an admin hasn't seen.
const updateCourse = async (req, res) => {
  try {
    const owned = await ownCourse(req, res);
    if (!owned) return;
    const { data, skillIds, error } = readCourse(req.body);
    if (error) return res.status(400).json({ message: error });

    const backToReview = owned.course.status === 'APPROVED' || owned.course.status === 'REJECTED';
    const course = await prisma.course.update({
      where: { id: owned.course.id },
      data: {
        ...data,
        ...(backToReview && { status: 'PENDING', rejectionReason: null }),
        skills: { deleteMany: {}, create: skillIds.map((id) => ({ skill: { connect: { id } } })) }
      },
      select: COURSE_CARD
    });
    if (backToReview) {
      notifyAdmins({
        type: 'COURSE_PENDING', title: 'A course was edited and needs review',
        body: course.title, link: '/admin-dashboard?tab=courses'
      });
    }
    res.status(200).json({ ...shapeCard(course), sentForReview: backToReview });
  } catch (error) {
    console.error('Update Course Error:', error);
    res.status(500).json({ message: 'Server error saving the course.' });
  }
};

const submitCourse = async (req, res) => {
  try {
    const owned = await ownCourse(req, res);
    if (!owned) return;
    if (owned.profile.status !== 'APPROVED') return res.status(403).json({ message: 'An admin has to approve your instructor account first.' });
    if (owned.course.status === 'PENDING') return res.status(400).json({ message: 'This course is already waiting for review.' });
    if (owned.course.status === 'APPROVED') return res.status(400).json({ message: 'This course is already approved.' });

    const lessons = await prisma.courseLesson.count({ where: { courseId: owned.course.id } });
    if (lessons === 0) return res.status(400).json({ message: 'Add at least one lesson before sending the course for review.' });

    await prisma.course.update({ where: { id: owned.course.id }, data: { status: 'PENDING', rejectionReason: null } });
    notifyAdmins({
      type: 'COURSE_PENDING', title: 'A course is waiting for review',
      body: `${owned.course.title} by ${owned.profile.fullName}`, link: '/admin-dashboard?tab=courses'
    });
    res.status(200).json({ message: 'Sent for review.' });
  } catch (error) {
    console.error('Submit Course Error:', error);
    res.status(500).json({ message: 'Server error sending the course for review.' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const owned = await ownCourse(req, res);
    if (!owned) return;
    await prisma.course.delete({ where: { id: owned.course.id } });
    res.status(200).json({ message: 'Course deleted.' });
  } catch (error) {
    console.error('Delete Course Error:', error);
    res.status(500).json({ message: 'Server error deleting the course.' });
  }
};

// Who enrolled, so the instructor can contact them.
const courseStudents = async (req, res) => {
  try {
    const owned = await ownCourse(req, res);
    if (!owned) return;
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: owned.course.id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, phone: true, studentProfile: { select: { id: true, fullName: true, university: true } } } },
        progress: { select: { lessonId: true } }
      }
    });
    const lessonCount = await prisma.courseLesson.count({ where: { courseId: owned.course.id } });
    res.status(200).json(enrollments.map((e) => ({
      userId: e.user.id,
      name: e.user.studentProfile?.fullName || e.user.email,
      email: e.user.email,
      phone: e.user.phone,
      studentProfileId: e.user.studentProfile?.id || null,
      university: e.user.studentProfile?.university || null,
      enrolledAt: e.createdAt,
      completedLessons: e.progress.length,
      lessonCount,
      completedAt: e.completedAt
    })));
  } catch (error) {
    console.error('Course Students Error:', error);
    res.status(500).json({ message: 'Server error loading your students.' });
  }
};

// ============ Admin ============

const adminListCourses = async (req, res) => {
  try {
    const where = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status) ? { status: req.query.status } : {};
    const courses = await prisma.course.findMany({
      where, orderBy: { createdAt: 'desc' },
      select: { ...COURSE_CARD, rejectionReason: true, instructor: { select: { id: true, fullName: true, headline: true, photoUrl: true, userId: true } } }
    });
    res.status(200).json(courses.map(shapeCard));
  } catch (error) {
    console.error('Admin List Courses Error:', error);
    res.status(500).json({ message: 'Server error loading courses.' });
  }
};

// Admins can also write a course for an approved instructor; it goes live
// straight away, the same way an admin-posted job does.
const adminCreateCourse = async (req, res) => {
  try {
    const instructor = await prisma.instructorProfile.findUnique({ where: { id: Number(req.body.instructorProfileId) }, select: { id: true, status: true, fullName: true, userId: true } });
    if (!instructor) return res.status(400).json({ message: 'Choose the instructor this course belongs to.' });
    if (instructor.status !== 'APPROVED') return res.status(400).json({ message: 'That instructor is not approved yet.' });
    const { data, skillIds, error } = readCourse(req.body);
    if (error) return res.status(400).json({ message: error });

    const course = await prisma.course.create({
      data: {
        ...data,
        instructorProfileId: instructor.id,
        status: 'APPROVED',
        publishedAt: new Date(),
        skills: { create: skillIds.map((id) => ({ skill: { connect: { id } } })) }
      },
      select: COURSE_CARD
    });
    notifyUser(instructor.userId, {
      type: 'COURSE_ADDED_BY_ADMIN', title: 'A course was added for you',
      body: `An admin published "${course.title}" under your name. You can edit it from your dashboard.`,
      link: '/instructor-dashboard'
    });
    await logAdminAction(req, {
      action: 'COURSE_CREATED', targetType: 'COURSE', targetId: course.id,
      summary: `Published course "${course.title}" for ${instructor.fullName}`
    });
    res.status(201).json(shapeCard(course));
  } catch (error) {
    console.error('Admin Create Course Error:', error);
    res.status(500).json({ message: 'Server error saving the course.' });
  }
};

const approveCourse = async (req, res) => {
  try {
    const course = await prisma.course.update({
      where: { id: Number(req.params.id) },
      data: { status: 'APPROVED', rejectionReason: null, publishedAt: new Date() },
      include: { instructor: { select: { userId: true, fullName: true } } }
    });
    notifyUser(course.instructor.userId, {
      type: 'COURSE_APPROVED', title: 'Your course is live',
      body: course.title, link: `/courses/${course.id}`
    });
    await logAdminAction(req, {
      action: 'COURSE_APPROVED', targetType: 'COURSE', targetId: course.id,
      summary: `Approved course "${course.title}" by ${course.instructor.fullName}`
    });
    res.status(200).json({ message: 'Course approved.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Course not found.' });
    console.error('Approve Course Error:', error);
    res.status(500).json({ message: 'Server error approving the course.' });
  }
};

const rejectCourse = async (req, res) => {
  try {
    const reason = (req.body.reason || '').trim();
    if (reason.length < 5) return res.status(400).json({ message: 'Please give a reason so the instructor knows what to fix.' });
    const course = await prisma.course.update({
      where: { id: Number(req.params.id) },
      data: { status: 'REJECTED', rejectionReason: reason },
      include: { instructor: { select: { userId: true, fullName: true } } }
    });
    notifyUser(course.instructor.userId, {
      type: 'COURSE_REJECTED', title: 'Your course was not approved',
      body: reason, link: '/instructor-dashboard'
    });
    await logAdminAction(req, {
      action: 'COURSE_REJECTED', targetType: 'COURSE', targetId: course.id,
      summary: `Rejected course "${course.title}" by ${course.instructor.fullName}`, details: { reason }
    });
    res.status(200).json({ message: 'Course rejected.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Course not found.' });
    console.error('Reject Course Error:', error);
    res.status(500).json({ message: 'Server error rejecting the course.' });
  }
};

const adminDeleteCourse = async (req, res) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: Number(req.params.id) }, include: { instructor: { select: { userId: true, fullName: true } }, _count: { select: { enrollments: true } } } });
    if (!course) return res.status(404).json({ message: 'Course not found.' });
    await prisma.course.delete({ where: { id: course.id } });
    notifyUser(course.instructor.userId, {
      type: 'COURSE_DELETED', title: 'A course of yours was removed',
      body: course.title, link: '/instructor-dashboard'
    });
    await logAdminAction(req, {
      action: 'COURSE_DELETED', targetType: 'COURSE', targetId: course.id,
      summary: `Deleted course "${course.title}" by ${course.instructor.fullName}`,
      details: { enrollments: course._count.enrollments }
    });
    res.status(200).json({ message: 'Course deleted.' });
  } catch (error) {
    console.error('Admin Delete Course Error:', error);
    res.status(500).json({ message: 'Server error deleting the course.' });
  }
};

module.exports = {
  listCourses, getCourse, enroll, unenroll, myCourses,
  listMyCourses, createCourse, updateCourse, submitCourse, deleteCourse, courseStudents,
  adminListCourses, adminCreateCourse, approveCourse, rejectCourse, adminDeleteCourse
};
