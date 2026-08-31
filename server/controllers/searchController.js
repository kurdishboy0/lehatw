const prisma = require('../db');

const RESULT_LIMIT = 20;

// Unified search across students (by name/university/field of study/skills) and
// job posts (by title/description/keyword/required skill) — powers the Home
// page search bar. Ranks matches whose primary field *starts with* the query
// above ones that merely *contain* it, then by recency.
const search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(200).json({ students: [], jobs: [], query: '' });
    }

    const [students, jobs] = await Promise.all([
      prisma.studentProfile.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { university: { contains: q, mode: 'insensitive' } },
            { fieldOfStudy: { contains: q, mode: 'insensitive' } },
            { skills: { some: { skill: { name_en: { contains: q, mode: 'insensitive' } } } } },
            { customSkills: { some: { name: { contains: q, mode: 'insensitive' } } } }
          ]
        },
        include: {
          skills: { include: { skill: true } }
        },
        take: RESULT_LIMIT * 2, // over-fetch a bit so re-ranking has something to work with
        orderBy: { id: 'desc' }
      }),
      prisma.jobPost.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { requirements: { contains: q, mode: 'insensitive' } },
            { skills: { some: { skill: { name_en: { contains: q, mode: 'insensitive' } } } } }
          ]
        },
        include: {
          hrProfile: { select: { companyName: true, industry: true } },
          skills: { include: { skill: true } }
        },
        take: RESULT_LIMIT * 2,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const query = q.toLowerCase();
    const startsWith = (text) => (text || '').toLowerCase().startsWith(query);

    const rankedStudents = students
      .sort((a, b) => Number(startsWith(b.fullName)) - Number(startsWith(a.fullName)))
      .slice(0, RESULT_LIMIT);

    const rankedJobs = jobs
      .sort((a, b) => Number(startsWith(b.title)) - Number(startsWith(a.title)))
      .slice(0, RESULT_LIMIT);

    res.status(200).json({ students: rankedStudents, jobs: rankedJobs, query: q });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: "Server error performing search." });
  }
};

module.exports = { search };
