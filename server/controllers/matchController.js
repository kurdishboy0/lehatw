const prisma = require('../db');
const { buildSkillVector, weightedJaccard, requiredSkillsCoverage, sharedCustomSkillNames } = require('../utils/similarity');

const PROFILE_INCLUDE = {
  skills: { include: { skill: true } },
  customSkills: true
};

// 1. Peer "Skill Match": ranks every other student by weighted skill similarity
// to the logged-in student, for the Skill Match page's "Recommended For You" list.
const getSimilarStudents = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ message: "Only students can view peer matches." });
    }

    const me = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      include: PROFILE_INCLUDE
    });

    if (!me) {
      return res.status(404).json({ message: "Please complete your profile first." });
    }

    const myVector = buildSkillVector(me);
    if (Object.keys(myVector).length === 0) {
      return res.status(200).json({ matches: [] });
    }

    const others = await prisma.studentProfile.findMany({
      where: { id: { not: me.id } },
      include: PROFILE_INCLUDE
    });

    const ranked = others
      .map((other) => {
        const otherVector = buildSkillVector(other);
        const similarity = weightedJaccard(myVector, otherVector);
        const sharedSkillNames = other.skills
          .filter((s) => myVector[`skill:${s.skillId}`])
          .map((s) => s.skill.name_en);
        const sharedCustom = sharedCustomSkillNames(me, other);

        return {
          id: other.id,
          fullName: other.fullName,
          university: other.university,
          fieldOfStudy: other.fieldOfStudy,
          photoUrl: other.photoUrl,
          similarityScore: Math.round(similarity * 100),
          sharedSkills: [...sharedSkillNames, ...sharedCustom]
        };
      })
      .filter((s) => s.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 30);

    res.status(200).json({ matches: ranked });
  } catch (error) {
    console.error("Similar Students Error:", error);
    res.status(500).json({ message: "Server error computing peer matches." });
  }
};

// 2. Search & filter students (public browse for everyone, extra-useful for HR):
// by subject area, field of study, specific skills, and free-text search.
const searchStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const skillIds = (req.query.skillIds || '')
      .split(',')
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id));
    const subjectAreaId = parseInt(req.query.subjectAreaId) || null;
    const categoryId = parseInt(req.query.categoryId) || null;
    const q = (req.query.q || '').trim();

    const where = { AND: [] };
    if (skillIds.length > 0) {
      where.AND.push({ skills: { some: { skillId: { in: skillIds } } } });
    }
    if (categoryId) {
      where.AND.push({ skills: { some: { skill: { categoryId } } } });
    } else if (subjectAreaId) {
      where.AND.push({ skills: { some: { skill: { category: { subjectAreaId } } } } });
    }
    if (q) {
      where.AND.push({
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { university: { contains: q, mode: 'insensitive' } },
          { fieldOfStudy: { contains: q, mode: 'insensitive' } },
          { customSkills: { some: { name: { contains: q, mode: 'insensitive' } } } }
        ]
      });
    }
    if (where.AND.length === 0) delete where.AND;

    const toResult = (student) => {
      const vector = buildSkillVector(student);
      const matchScore = skillIds.length > 0 ? requiredSkillsCoverage(vector, skillIds) : null;
      return {
        id: student.id,
        fullName: student.fullName,
        university: student.university,
        fieldOfStudy: student.fieldOfStudy,
        photoUrl: student.photoUrl,
        matchScore,
        skills: student.skills.map((s) => ({ id: s.skill.id, name_en: s.skill.name_en, name_ar: s.skill.name_ar, name_ckb: s.skill.name_ckb, proficiency: s.proficiency })),
        customSkills: student.customSkills.map((cs) => cs.name)
      };
    };

    let results, totalStudents;

    if (skillIds.length > 0) {
      // Scoring depends on data outside SQL's reach (proficiency-weighted coverage),
      // so we score and sort the whole matching set in memory before paginating.
      const allMatches = await prisma.studentProfile.findMany({ where, include: PROFILE_INCLUDE });
      const scored = allMatches.map(toResult).sort((a, b) => b.matchScore - a.matchScore);
      totalStudents = scored.length;
      results = scored.slice(skip, skip + limit);
    } else {
      const [count, students] = await Promise.all([
        prisma.studentProfile.count({ where }),
        prisma.studentProfile.findMany({
          where,
          skip,
          take: limit,
          include: PROFILE_INCLUDE,
          orderBy: { id: 'desc' }
        })
      ]);
      totalStudents = count;
      results = students.map(toResult);
    }

    res.status(200).json({
      students: results,
      totalPages: Math.ceil(totalStudents / limit),
      currentPage: page,
      totalStudents
    });
  } catch (error) {
    console.error("Search Students Error:", error);
    res.status(500).json({ message: "Server error searching students." });
  }
};

module.exports = { getSimilarStudents, searchStudents };
