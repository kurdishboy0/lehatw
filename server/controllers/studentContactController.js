const prisma = require('../db');
const { normalizeContactPhone } = require('../utils/contactPhone');

const getContact = async (req, res) => {
  if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Access denied.' });
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { phone: true } });
  return res.json({ phone: user?.phone || '' });
};

const updateContact = async (req, res) => {
  if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Access denied.' });
  const phone = normalizeContactPhone(req.body.phone);
  if (!phone) return res.status(400).json({ code: 'INVALID_PHONE', message: 'Enter a valid contact phone number.' });
  // phoneVerified is the legacy email-verification field. Editing contact
  // information must never activate an account or change email verification.
  await prisma.user.update({ where: { id: req.user.id }, data: { phone } });
  return res.json({ phone });
};
module.exports = { getContact, updateContact };
