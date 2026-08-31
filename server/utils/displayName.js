const prisma = require('../db');

// Resolves a friendly display name for a user: the student's full name, the
// company's name for HR, or the email's local part as a fallback.
const getDisplayName = async (user) => {
  if (user.role === 'STUDENT') {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { fullName: true } });
    if (profile?.fullName) return profile.fullName;
  } else if (user.role === 'HR') {
    const profile = await prisma.hRProfile.findUnique({ where: { userId: user.id }, select: { companyName: true } });
    if (profile?.companyName) return profile.companyName;
  }
  return user.email.split('@')[0];
};

module.exports = { getDisplayName };
