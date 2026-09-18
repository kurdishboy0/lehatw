const prisma = require('../../db');

// Items waiting on an admin, for the console's nav badges.
const getPendingCounts = async (req, res) => {
  try {
    const [companies, skills, reports] = await Promise.all([
      prisma.hRProfile.count({ where: { status: 'PENDING' } }),
      prisma.customSkill.count({ where: { isApproved: false } }),
      prisma.report.count({ where: { status: 'OPEN' } })
    ]);
    res.status(200).json({ companies, skills, reports, approvals: companies + skills });
  } catch (error) {
    console.error('Pending Counts Error:', error);
    res.status(500).json({ message: 'Server error fetching pending counts.' });
  }
};

// Who the console is being viewed by, so it can show super-admin tools.
const getMe = (req, res) => {
  res.status(200).json({ id: req.user.id, email: req.user.email, isSuperAdmin: req.user.isSuperAdmin });
};

module.exports = { getPendingCounts, getMe };
