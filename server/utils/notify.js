const prisma = require('../db');

// Fire-and-forget notification helpers. Callers should not await these on the
// request's critical path; failures are logged, never thrown back to the user.
async function notifyUser(userId, { type, title, body, link }) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body: body || null, link: link || null }
    });
  } catch (error) {
    console.error('notifyUser failed:', error);
  }
}

async function notifyAdmins({ type, title, body, link }) {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    if (admins.length === 0) return;
    await prisma.notification.createMany({
      data: admins.map((a) => ({ userId: a.id, type, title, body: body || null, link: link || null }))
    });
  } catch (error) {
    console.error('notifyAdmins failed:', error);
  }
}

module.exports = { notifyUser, notifyAdmins };
