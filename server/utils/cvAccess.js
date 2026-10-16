const prisma = require('../db');

// Who may look at a CV.
//
// The owner, obviously. An admin, for moderation. And a company, but only one
// the person actually applied to: posting a job does not entitle you to read
// the CV of everyone on the site, only of the people who chose to send it to
// you. Everyone else is refused, including companies with no application from
// that person and talent looking at each other.
//
// Both entry points come through here so the rule is written once.

async function canViewTalentResume(viewer, studentUserId) {
  if (!viewer) return false;
  if (viewer.id === studentUserId) return true;
  if (viewer.role === 'ADMIN') return true;

  if (viewer.role === 'HR') {
    const application = await prisma.application.findFirst({
      where: {
        studentId: studentUserId,
        jobPost: { hrProfile: { userId: viewer.id } }
      },
      select: { id: true }
    });
    return Boolean(application);
  }
  return false;
}

async function canViewApplicationCv(viewer, application) {
  if (!viewer || !application) return false;
  if (viewer.id === application.studentId) return true;
  if (viewer.role === 'ADMIN') return true;
  if (viewer.role === 'HR') return application.jobPost?.hrProfile?.userId === viewer.id;
  return false;
}

module.exports = { canViewTalentResume, canViewApplicationCv };
