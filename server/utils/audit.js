const prisma = require('../db');

// Records an admin action. Awaited by callers so the audit trail can't silently
// fall behind the change it describes, but a logging failure never undoes or
// blocks the action itself.
async function logAdminAction(req, { action, targetType = null, targetId = null, summary, details = null }) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: req.user.id,
        adminEmail: req.user.email,
        action,
        targetType,
        targetId: targetId === null ? null : Number(targetId),
        summary,
        details
      }
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}

module.exports = { logAdminAction };
