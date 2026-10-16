const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { findUsableToken, hash } = require('../utils/accountSetup');
const { getDisplayName } = require('../utils/displayName');

const MIN_PASSWORD = 8;

// Public: what the set-password page shows before anyone types a password.
const checkSetupToken = async (req, res) => {
  try {
    const { row, error } = await findUsableToken(req.params.token);
    if (error) return res.status(400).json({ message: error });
    res.status(200).json({
      email: row.user.email,
      role: row.user.role,
      name: row.user.studentProfile?.fullName || row.user.hrProfile?.companyName || null
    });
  } catch (error) {
    console.error('Check Setup Token Error:', error);
    res.status(500).json({ message: 'Server error checking the link.' });
  }
};

// Public: sets the password for an admin-created account and signs them in.
const completeSetup = async (req, res) => {
  try {
    const { token, password } = req.body;
    const { row, error } = await findUsableToken(token);
    if (error) return res.status(400).json({ message: error });
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      return res.status(400).json({ message: `Your password must be at least ${MIN_PASSWORD} characters.` });
    }

    const user = await prisma.user.update({
      where: { id: row.user.id },
      // The admin already vouched for this address, so it counts as verified.
      data: { password: await bcrypt.hash(password, 10), passwordChangedAt: new Date(), phoneVerified: true, phoneOtp: null, phoneOtpExpires: null }
    });
    await prisma.accountSetupToken.update({ where: { tokenHash: hash(token) }, data: { usedAt: new Date() } });

    const jwtToken = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({
      message: 'Password set.',
      token: jwtToken,
      user: { id: user.id, email: user.email, role: user.role, name: await getDisplayName(user) }
    });
  } catch (error) {
    console.error('Complete Setup Error:', error);
    res.status(500).json({ message: 'Server error setting your password.' });
  }
};

module.exports = { checkSetupToken, completeSetup };
