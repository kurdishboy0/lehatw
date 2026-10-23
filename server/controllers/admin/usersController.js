const bcrypt = require('bcrypt');
const prisma = require('../../db');
const sendEmail = require('../../utils/sendEmail');
const { notifyUser } = require('../../utils/notify');
const { logAdminAction } = require('../../utils/audit');
const { invalidateUserCache } = require('../../middleware/authMiddleware');
const { sendVerificationEmail } = require('../authController');
const { generateTempPassword } = require('../../utils/tempPassword');
const { deleteStoredFile } = require('../../utils/supabaseStorage');

const PAGE_SIZE = 25;
const MIN_REASON = 5;
const ROLES = ['STUDENT', 'HR', 'INSTRUCTOR', 'ADMIN'];
const STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'];

const USER_SELECT = {
  id: true, email: true, role: true, createdAt: true, phone: true, phoneVerified: true,
  accountStatus: true, statusReason: true, suspendedUntil: true, isSuperAdmin: true,
  googleId: true, linkedinId: true,
  studentProfile: { select: { id: true, fullName: true, university: true } },
  hrProfile: { select: { id: true, companyName: true, status: true } },
  instructorProfile: { select: { id: true, fullName: true, status: true } }
};

function emailQuietly(to, subject, text) {
  sendEmail(to, subject, text).catch((err) => console.error('Admin email failed (non-fatal):', err));
}

// Signup verification is by email code, stored in the phone* fields for
// historical reasons. A contact number is independent of email ownership.
const isVerified = (u) => u.phoneVerified;

function shape(u) {
  const { googleId, linkedinId, ...rest } = u;
  return {
    ...rest,
    name: u.studentProfile?.fullName || u.hrProfile?.companyName || u.instructorProfile?.fullName || null,
    verified: isVerified(u),
    loginMethods: [googleId && 'google', linkedinId && 'linkedin'].filter(Boolean)
  };
}

class GuardError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function countActiveSuperAdmins() {
  return prisma.user.count({ where: { role: 'ADMIN', isSuperAdmin: true, accountStatus: 'ACTIVE' } });
}

// Loads the target and applies the rules every account action shares.
async function loadManageableUser(req) {
  const target = await prisma.user.findUnique({ where: { id: Number(req.params.id) }, select: USER_SELECT });
  if (!target) throw new GuardError(404, 'User not found.');
  if (target.id === req.user.id) throw new GuardError(400, "You can't do this to your own account.");
  if (target.role === 'ADMIN' && !req.user.isSuperAdmin) {
    throw new GuardError(403, 'Only a super-admin can manage other admin accounts.');
  }
  return target;
}

// Wraps a handler so guard failures become clean 4xx responses.
const handle = (label, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof GuardError) return res.status(error.status).json({ message: error.message });
    console.error(`${label} Error:`, error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ============ Listing ============

const listUsers = handle('List Users', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const q = (req.query.q || '').trim();
  const where = { AND: [] };
  if (ROLES.includes(req.query.role)) where.AND.push({ role: req.query.role });
  if (STATUSES.includes(req.query.status)) where.AND.push({ accountStatus: req.query.status });
  if (req.query.verified === 'no') where.AND.push({ phoneVerified: false });
  if (req.query.verified === 'yes') where.AND.push({ phoneVerified: true });
  if (q) {
    const contains = { contains: q, mode: 'insensitive' };
    where.AND.push({
      OR: [
        { email: contains },
        { studentProfile: { fullName: contains } },
        { hrProfile: { companyName: contains } },
        { instructorProfile: { fullName: contains } },
        ...(/^\d+$/.test(q) ? [{ id: Number(q) }] : [])
      ]
    });
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: USER_SELECT, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE })
  ]);
  res.status(200).json({ users: users.map(shape), total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
});

const getUser = handle('Get User', async (req, res) => {
  const id = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const [applications, jobPosts, reportsAgainst, history] = await Promise.all([
    prisma.application.count({ where: { studentId: id } }),
    user.hrProfile ? prisma.jobPost.count({ where: { hrProfileId: user.hrProfile.id } }) : 0,
    prisma.report.count({ where: { targetType: 'USER', targetId: id } }),
    prisma.adminAuditLog.findMany({
      where: { targetType: 'USER', targetId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, summary: true, adminEmail: true, createdAt: true }
    })
  ]);
  res.status(200).json({ ...shape(user), stats: { applications, jobPosts, reportsAgainst }, history });
});

// ============ Account status ============

const setStatus = handle('Set Status', async (req, res) => {
  const target = await loadManageableUser(req);
  const status = req.body.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Status must be ACTIVE, SUSPENDED, or BANNED.' });
  if (status === 'ACTIVE' && target.accountStatus === 'ACTIVE') return res.status(400).json({ message: 'This account is already active.' });

  const reason = (req.body.reason || '').trim();
  if (status !== 'ACTIVE' && reason.length < MIN_REASON) {
    return res.status(400).json({ message: 'Please give a reason. The user will see it when they try to log in.' });
  }

  let until = null;
  if (status === 'SUSPENDED' && req.body.until) {
    until = new Date(req.body.until);
    if (Number.isNaN(until.getTime()) || until <= new Date()) {
      return res.status(400).json({ message: 'The suspension end date must be in the future.' });
    }
  }

  if (status !== 'ACTIVE' && target.isSuperAdmin && (await countActiveSuperAdmins()) <= 1) {
    return res.status(400).json({ message: "You can't block the last active super-admin." });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: status === 'ACTIVE'
      ? { accountStatus: 'ACTIVE', statusReason: null, suspendedUntil: null }
      : { accountStatus: status, statusReason: reason, suspendedUntil: until },
    select: USER_SELECT
  });
  invalidateUserCache(target.id);

  const untilText = until ? until.toUTCString() : null;
  if (status === 'BANNED') {
    emailQuietly(target.email, 'Your Lehatw account has been banned',
      `Your Lehatw account has been banned.\n\nReason: ${reason}\n\nIf you think this is a mistake, reply to this email.`);
  } else if (status === 'SUSPENDED') {
    emailQuietly(target.email, 'Your Lehatw account has been suspended',
      `Your Lehatw account has been suspended${untilText ? ` until ${untilText}` : ''}.\n\nReason: ${reason}\n\nIf you think this is a mistake, reply to this email.`);
  } else if (target.accountStatus !== 'ACTIVE') {
    emailQuietly(target.email, 'Your Lehatw account is active again',
      'Your Lehatw account has been reactivated. You can log in again.');
  }

  const actionByStatus = { ACTIVE: 'USER_REACTIVATED', SUSPENDED: 'USER_SUSPENDED', BANNED: 'USER_BANNED' };
  await logAdminAction(req, {
    action: actionByStatus[status], targetType: 'USER', targetId: target.id,
    summary: status === 'ACTIVE'
      ? `Reactivated ${target.email}`
      : `${status === 'BANNED' ? 'Banned' : 'Suspended'} ${target.email}${untilText ? ` until ${untilText}` : ''}`,
    details: status === 'ACTIVE' ? { previousStatus: target.accountStatus } : { reason, until: until ? until.toISOString() : null }
  });

  res.status(200).json({ message: 'Account status updated.', user: shape(updated) });
});

// ============ Access recovery ============

const resetPassword = handle('Admin Reset Password', async (req, res) => {
  const target = await loadManageableUser(req);
  const tempPassword = generateTempPassword();
  await prisma.user.update({
    where: { id: target.id },
    data: { password: await bcrypt.hash(tempPassword, 10), passwordChangedAt: new Date(), resetOtp: null, resetOtpExpires: null }
  });
  // Any session opened with the old password ends here, which is usually the
  // point of an admin resetting it.
  invalidateUserCache(target.id);
  emailQuietly(target.email, 'Your Lehatw password was reset',
    `A Lehatw admin reset your password.\n\nTemporary password: ${tempPassword}\n\nLog in with it, then change it with "Forgot your password?" on the login page.`);
  // The password itself is never written to the audit log.
  await logAdminAction(req, {
    action: 'USER_PASSWORD_RESET', targetType: 'USER', targetId: target.id,
    summary: `Reset the password for ${target.email}`
  });
  res.status(200).json({ message: 'Password reset. The new temporary password was emailed to the user.', tempPassword });
});

const resendVerification = handle('Resend Verification', async (req, res) => {
  const target = await loadManageableUser(req);
  if (isVerified(target)) return res.status(400).json({ message: 'This account is already verified.' });
  await sendVerificationEmail(target);
  await logAdminAction(req, {
    action: 'USER_VERIFICATION_RESENT', targetType: 'USER', targetId: target.id,
    summary: `Resent the verification code to ${target.email}`
  });
  res.status(200).json({ message: 'Verification code sent.' });
});

const markVerified = handle('Mark Verified', async (req, res) => {
  const target = await loadManageableUser(req);
  if (isVerified(target)) return res.status(400).json({ message: 'This account is already verified.' });
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { phoneVerified: true, phoneOtp: null, phoneOtpExpires: null },
    select: USER_SELECT
  });
  emailQuietly(target.email, 'Your Lehatw account is verified',
    'A Lehatw admin verified your account. You can log in now.');
  await logAdminAction(req, {
    action: 'USER_VERIFIED', targetType: 'USER', targetId: target.id,
    summary: `Manually verified ${target.email}`
  });
  res.status(200).json({ message: 'Account verified.', user: shape(updated) });
});

// ============ Role ============

const setRole = handle('Set Role', async (req, res) => {
  const target = await loadManageableUser(req);
  const role = req.body.role;
  if (!ROLES.includes(role)) return res.status(400).json({ message: 'That role is not valid.' });
  if (role === target.role) return res.status(400).json({ message: 'The user already has this role.' });
  if ((role === 'ADMIN' || target.role === 'ADMIN') && !req.user.isSuperAdmin) {
    return res.status(403).json({ message: 'Only a super-admin can give or remove admin access.' });
  }
  if (target.isSuperAdmin && (await countActiveSuperAdmins()) <= 1) {
    return res.status(400).json({ message: "You can't remove the last active super-admin." });
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role, ...(target.role === 'ADMIN' && { isSuperAdmin: false }) },
    select: USER_SELECT
  });
  invalidateUserCache(target.id);
  notifyUser(target.id, {
    type: 'ROLE_CHANGED', title: 'Your account type changed',
    body: `An admin changed your account from ${target.role} to ${role}. Log out and back in to see the change.`,
    link: '/'
  });
  await logAdminAction(req, {
    action: 'USER_ROLE_CHANGED', targetType: 'USER', targetId: target.id,
    summary: `Changed ${target.email} from ${target.role} to ${role}`,
    details: { from: target.role, to: role }
  });
  res.status(200).json({ message: 'Role updated.', user: shape(updated) });
});

// ============ Delete ============

// Permanently removes an account and everything tied to it. Profiles have no
// cascade from User, so they go first; the rest cascades from the user row
// (applications, messages, notifications, reports they filed) or from the
// company profile (job posts and the applications to them).
const deleteUser = handle('Delete User', async (req, res) => {
  const target = await loadManageableUser(req);
  const reason = (req.body.reason || '').trim();
  if (reason.length < MIN_REASON) {
    return res.status(400).json({ message: 'Please give a reason. The user is emailed it.' });
  }
  if ((req.body.confirmEmail || '').trim().toLowerCase() !== target.email.toLowerCase()) {
    return res.status(400).json({ message: "The email you typed doesn't match this account." });
  }
  if (target.isSuperAdmin && (await countActiveSuperAdmins()) <= 1) {
    return res.status(400).json({ message: "You can't delete the last active super-admin." });
  }

  const [profile, ownApplications, jobPosts, messages] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: target.id }, select: { photoUrl: true, resumeUrl: true } }),
    prisma.application.findMany({ where: { studentId: target.id }, select: { cvUrl: true } }),
    target.hrProfile ? prisma.jobPost.count({ where: { hrProfileId: target.hrProfile.id } }) : 0,
    prisma.message.count({ where: { OR: [{ senderId: target.id }, { recipientId: target.id }] } })
  ]);
  // Only files this user uploaded; other students' CVs on a company's job
  // posts belong to those students and stay in storage.
  const files = [...new Set([profile?.photoUrl, profile?.resumeUrl, ...ownApplications.map((a) => a.cvUrl)].filter(Boolean))];

  await prisma.$transaction([
    prisma.studentProfile.deleteMany({ where: { userId: target.id } }),
    prisma.hRProfile.deleteMany({ where: { userId: target.id } }),
    ...(target.instructorProfile ? [prisma.instructorProfile.deleteMany({ where: { userId: target.id } })] : []),
    prisma.user.delete({ where: { id: target.id } })
  ]);
  invalidateUserCache(target.id);
  for (const file of files) deleteStoredFile(file);

  emailQuietly(target.email, 'Your Lehatw account was deleted',
    `Your Lehatw account (${target.email}) was deleted by an admin.\n\nReason: ${reason}\n\nIf you think this is a mistake, reply to this email.`);
  await logAdminAction(req, {
    action: 'USER_DELETED', targetType: 'USER', targetId: target.id,
    summary: `Deleted the account ${target.email} (${target.role})`,
    details: {
      reason, email: target.email, role: target.role, name: shape(target).name,
      removed: { applications: ownApplications.length, jobPosts, messages, files: files.length }
    }
  });
  res.status(200).json({ message: 'Account deleted.' });
});

// ============ Admin accounts (super-admin only) ============

const listAdmins = handle('List Admins', async (req, res) => {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: USER_SELECT, orderBy: { createdAt: 'asc' } });
  res.status(200).json(admins.map(shape));
});

// Promotes an existing account, or creates a new admin account with a
// temporary password when the email isn't registered yet.
const addAdmin = handle('Add Admin', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  const makeSuper = req.body.isSuperAdmin === true;

  const existing = await prisma.user.findUnique({ where: { email }, select: USER_SELECT });
  if (existing?.role === 'ADMIN') return res.status(400).json({ message: 'This account is already an admin.' });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id }, data: { role: 'ADMIN', isSuperAdmin: makeSuper }, select: USER_SELECT
    });
    invalidateUserCache(existing.id);
    emailQuietly(email, 'You are now a Lehatw admin',
      'Your Lehatw account was given admin access. Log out and back in to open the Admin Console.');
    await logAdminAction(req, {
      action: 'ADMIN_ADDED', targetType: 'USER', targetId: existing.id,
      summary: `Gave admin access to ${email} (was ${existing.role})${makeSuper ? ' as super-admin' : ''}`,
      details: { previousRole: existing.role, isSuperAdmin: makeSuper }
    });
    return res.status(200).json({ message: 'Admin access granted.', user: shape(updated), created: false });
  }

  const tempPassword = generateTempPassword();
  const created = await prisma.user.create({
    data: { email, password: await bcrypt.hash(tempPassword, 10), role: 'ADMIN', isSuperAdmin: makeSuper, phoneVerified: true },
    select: USER_SELECT
  });
  emailQuietly(email, 'Your Lehatw admin account',
    `A Lehatw admin account was created for you.\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nLog in and change it with "Forgot your password?" on the login page.`);
  await logAdminAction(req, {
    action: 'ADMIN_ADDED', targetType: 'USER', targetId: created.id,
    summary: `Created admin account ${email}${makeSuper ? ' as super-admin' : ''}`,
    details: { created: true, isSuperAdmin: makeSuper }
  });
  res.status(201).json({ message: 'Admin account created.', user: shape(created), created: true, tempPassword });
});

const setSuperAdmin = handle('Set Super Admin', async (req, res) => {
  const target = await loadManageableUser(req);
  if (target.role !== 'ADMIN') return res.status(400).json({ message: 'Only admins can be super-admins.' });
  const makeSuper = req.body.isSuperAdmin === true;
  if (!makeSuper && target.isSuperAdmin && (await countActiveSuperAdmins()) <= 1) {
    return res.status(400).json({ message: "You can't remove the last active super-admin." });
  }
  const updated = await prisma.user.update({ where: { id: target.id }, data: { isSuperAdmin: makeSuper }, select: USER_SELECT });
  invalidateUserCache(target.id);
  await logAdminAction(req, {
    action: makeSuper ? 'SUPER_ADMIN_GRANTED' : 'SUPER_ADMIN_REVOKED', targetType: 'USER', targetId: target.id,
    summary: `${makeSuper ? 'Made' : 'Removed'} ${target.email} ${makeSuper ? 'a super-admin' : 'as super-admin'}`
  });
  res.status(200).json({ message: 'Updated.', user: shape(updated) });
});

// Removing admin access returns the account to the role its profile fits.
const removeAdmin = handle('Remove Admin', async (req, res) => {
  const target = await loadManageableUser(req);
  if (target.role !== 'ADMIN') return res.status(400).json({ message: 'This account is not an admin.' });
  if (target.isSuperAdmin && (await countActiveSuperAdmins()) <= 1) {
    return res.status(400).json({ message: "You can't remove the last active super-admin." });
  }
  const fallbackRole = target.hrProfile ? 'HR' : 'STUDENT';
  const updated = await prisma.user.update({
    where: { id: target.id }, data: { role: fallbackRole, isSuperAdmin: false }, select: USER_SELECT
  });
  invalidateUserCache(target.id);
  await logAdminAction(req, {
    action: 'ADMIN_REMOVED', targetType: 'USER', targetId: target.id,
    summary: `Removed admin access from ${target.email} (now ${fallbackRole})`,
    details: { newRole: fallbackRole }
  });
  res.status(200).json({ message: 'Admin access removed.', user: shape(updated) });
});

module.exports = {
  listUsers, getUser, setStatus, resetPassword, resendVerification, markVerified, setRole, deleteUser,
  listAdmins, addAdmin, setSuperAdmin, removeAdmin
};
