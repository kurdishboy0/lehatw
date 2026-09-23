const crypto = require('crypto');
const prisma = require('../db');
const sendEmail = require('./sendEmail');

const SETUP_TOKEN_DAYS = 7;

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

// The address the set-password link points at: CLIENT_URL when configured,
// otherwise the site the admin is using.
function siteUrlFrom(req) {
  const url = process.env.CLIENT_URL || req.get('origin');
  return /^https?:\/\/[^\s/]+$/.test(url || '') ? url : null;
}

// Issues a fresh one-time link and drops any earlier ones for that account,
// so only the newest email works.
async function createSetupLink(req, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.accountSetupToken.deleteMany({ where: { userId } }),
    prisma.accountSetupToken.create({
      data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + SETUP_TOKEN_DAYS * 24 * 60 * 60 * 1000) }
    })
  ]);
  const site = siteUrlFrom(req);
  return { token, url: site ? `${site}/set-password?token=${token}` : null };
}

// Sends the welcome email. Fire-and-forget: the admin's request shouldn't fail
// because a mail server is slow.
function sendSetupEmail({ to, name, roleLabel, link, invitedBy }) {
  const greeting = name ? `Hi ${name},` : 'Hello,';
  const body = `${greeting}

${invitedBy} created a ${roleLabel} account for you on Lehatw (${to}).

${link
    ? `Choose your password and start using it here:\n${link}\n\nThe link works for ${SETUP_TOKEN_DAYS} days.`
    : `Go to Lehatw and use "Forgot your password?" to set your password.`}`;
  sendEmail(to, 'Your Lehatw account is ready', body)
    .catch((error) => console.error('Account setup email failed (non-fatal):', error));
}

// Looks up a setup token and says why it can't be used, if it can't.
async function findUsableToken(token) {
  if (!token || typeof token !== 'string') return { error: 'This link is not valid.' };
  const row = await prisma.accountSetupToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { select: { id: true, email: true, role: true, accountStatus: true, studentProfile: { select: { fullName: true } }, hrProfile: { select: { companyName: true } } } } }
  });
  if (!row || row.usedAt) return { error: 'This link has already been used or is no longer valid.' };
  if (row.expiresAt <= new Date()) return { error: 'This link has expired. Ask an admin to send a new one.' };
  if (row.user.accountStatus !== 'ACTIVE') return { error: 'This account is not active. Contact us for help.' };
  return { row };
}

module.exports = { createSetupLink, sendSetupEmail, findUsableToken, hash, SETUP_TOKEN_DAYS };
