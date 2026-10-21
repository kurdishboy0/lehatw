const prisma = require('../db');
const { openJobWhere } = require('../utils/jobDeadline');

// Public platform totals shown on the About Us page.
const getPublicStats = async (req, res) => {
  try {
    const [studentCount, companyCount, jobCount] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.hRProfile.count({ where: { status: 'APPROVED' } }),
      prisma.jobPost.count({ where: openJobWhere() })
    ]);

    res.status(200).json({ studentCount, companyCount, jobCount });
  } catch (error) {
    console.error('Get Public Stats Error:', error);
    res.status(500).json({ message: 'Server error fetching platform stats.' });
  }
};

module.exports = { getPublicStats };
