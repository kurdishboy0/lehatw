const prisma = require('../db');

// Returns why this account may not use the platform right now, or null if it can.
// A suspension whose end date has passed is treated as lifted (and is written
// back as ACTIVE so admin lists stay accurate).
function getAccountBlock(user) {
  if (!user) return null;

  if (user.accountStatus === 'BANNED') {
    return {
      code: 'ACCOUNT_BANNED',
      message: 'This account has been banned.',
      reason: user.statusReason || null,
      until: null
    };
  }

  if (user.accountStatus === 'SUSPENDED') {
    const until = user.suspendedUntil ? new Date(user.suspendedUntil) : null;
    if (until && until <= new Date()) {
      prisma.user
        .update({ where: { id: user.id }, data: { accountStatus: 'ACTIVE', statusReason: null, suspendedUntil: null } })
        .catch((err) => console.error('Failed to lift expired suspension:', err));
      return null;
    }
    return {
      code: 'ACCOUNT_SUSPENDED',
      message: until ? 'This account is temporarily suspended.' : 'This account is suspended.',
      reason: user.statusReason || null,
      until: until ? until.toISOString() : null
    };
  }

  return null;
}

// Standard 403 body for a blocked account, used by login paths and the auth middleware.
function blockedResponse(res, block) {
  return res.status(403).json(block);
}

module.exports = { getAccountBlock, blockedResponse };
