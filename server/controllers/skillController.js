const prisma = require('../db');
const { normalize, validateSkillText, findExactSkillMatch } = require('../utils/skillText');

// 1. Fetch the master list of all Categories (Fields of Study) and their Skills
const getAllSkills = async (req, res) => {
  try {
    // We use "include" to tell Prisma to grab the categories AND the skills inside them
    const categories = await prisma.category.findMany({
      include: {
        skills: true,
        subjectArea: true
      },
      orderBy: [{ subjectAreaId: 'asc' }, { id: 'asc' }]
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Fetch Skills Error:", error);
    res.status(500).json({ message: "Server error fetching skills." });
  }
};

// 2. Fetch the Subject Areas (broad academic domains), each with its Fields of Study
// and their Skills nested inside — powers the taxonomy filter on the Skill Match page.
const getTaxonomy = async (req, res) => {
  try {
    const subjectAreas = await prisma.subjectArea.findMany({
      include: {
        categories: { include: { skills: true }, orderBy: { id: 'asc' } }
      },
      orderBy: { id: 'asc' }
    });
    res.status(200).json(subjectAreas);
  } catch (error) {
    console.error("Fetch Taxonomy Error:", error);
    res.status(500).json({ message: "Server error fetching taxonomy." });
  }
};

// 2. Save ALL skills (Standard + Custom) for a student at once
const saveStudentSkills = async (req, res) => {
  try {
    const userId = req.user.id;
    const { standardSkills, customSkills } = req.body;
    // standardSkills format: [{ skillId: 1, proficiency: "Expert" }, ...]
    // customSkills format: ["MedSAM2", "Explainable AI"]

    // First, find the student's profile ID
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: userId }
    });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found. Please create one first." });
    }

    // Validate every custom skill's text before touching the database, so a bad
    // entry doesn't silently corrupt an otherwise-fine save.
    const invalidEntries = [];
    for (const rawName of customSkills || []) {
      const reason = validateSkillText(rawName);
      if (reason) invalidEntries.push({ name: rawName, reason });
    }
    if (invalidEntries.length > 0) {
      return res.status(400).json({
        message: `Invalid custom skill "${invalidEntries[0].name}": ${invalidEntries[0].reason}.`,
        invalidEntries
      });
    }

    // Fold any custom entry that exactly matches an existing catalog skill
    // (case-insensitively) into the standard list instead of creating a
    // duplicate — e.g. typing "python" when "Python" already exists.
    const allSkills = await prisma.skill.findMany({ select: { id: true, name_en: true } });
    const resolvedStandard = [...(standardSkills || [])];
    const remainingCustom = [];
    for (const rawName of customSkills || []) {
      const match = findExactSkillMatch(rawName, allSkills);
      if (match && !resolvedStandard.some((s) => Number(s.skillId) === match.id)) {
        resolvedStandard.push({ skillId: match.id, proficiency: 'Intermediate' });
      } else if (!match) {
        remainingCustom.push(normalize(rawName));
      }
    }

    // Use a transaction to safely update everything at exactly the same time
    await prisma.$transaction([
      // A. Clear old standard skills so we don't get duplicates if they unchecked a box
      prisma.studentSkill.deleteMany({
        where: { studentProfileId: profile.id }
      }),
      // B. Clear old custom skills
      prisma.customSkill.deleteMany({
        where: { studentProfileId: profile.id }
      }),
      // C. Insert the newly selected standard skills (including any custom entries
      // that turned out to be exact matches for an existing catalog skill)
      prisma.studentSkill.createMany({
        data: resolvedStandard.map(skill => ({
          studentProfileId: profile.id,
          skillId: parseInt(skill.skillId),
          proficiency: skill.proficiency
        }))
      }),
      // D. Insert the genuinely new custom manual skills (Defaults to isApproved: false)
      prisma.customSkill.createMany({
        data: remainingCustom.map(skillName => ({
          studentProfileId: profile.id,
          name: skillName,
          isApproved: false
        }))
      })
    ]);

    res.status(200).json({ message: "All skills saved successfully!" });

  } catch (error) {
    console.error("Save Skills Error:", error);
    res.status(500).json({ message: "Server error saving skills." });
  }
};

module.exports = { getAllSkills, getTaxonomy, saveStudentSkills };