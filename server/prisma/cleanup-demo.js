// Removes every demo account created by seed-demo.js (identified by the
// @*.demo.lehatw.test / .demo.lehatw.test email domains). Cascading deletes
// on User (StudentProfile, HRProfile, JobPost, skills, applications, etc.)
// take care of everything linked to those accounts.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { contains: '.demo.lehatw.test' } },
    select: { id: true, email: true }
  });

  if (demoUsers.length === 0) {
    console.log('No demo accounts found — nothing to clean up.');
    return;
  }

  const userIds = demoUsers.map((u) => u.id);

  // HRProfile/StudentProfile -> User has no cascade, so their rows (and
  // everything cascading from THEM, like job posts and skills) must go first.
  await prisma.hRProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.studentProfile.deleteMany({ where: { userId: { in: userIds } } });

  const result = await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log(`Removed ${result.count} demo accounts (and everything linked to them: job posts, profiles, skills).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
