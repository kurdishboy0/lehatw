const prisma = require('../../db');
const { logAdminAction } = require('../../utils/audit');
const { looseKey } = require('../../utils/skillText');

const MAX_NAME = 100;

class CatalogError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

const handle = (label, fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof CatalogError) return res.status(error.status).json({ message: error.message, ...error.extra });
    if (error.code === 'P2025') return res.status(404).json({ message: 'Not found.' });
    console.error(`${label} Error:`, error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Every catalog entry carries its name in all three languages.
function readNames(body) {
  const names = {};
  for (const lang of ['en', 'ar', 'ckb']) {
    const value = String(body[`name_${lang}`] || '').trim().replace(/\s+/g, ' ');
    if (!value) throw new CatalogError(400, 'Please fill in the name in English, Arabic, and Kurdish.');
    if (value.length > MAX_NAME) throw new CatalogError(400, `Names can be at most ${MAX_NAME} characters.`);
    names[`name_${lang}`] = value;
  }
  return names;
}

const describe = (names) => `"${names.name_en}"`;

// ============ Read ============

const getCatalog = handle('Get Catalog', async (req, res) => {
  const [areas, unassigned] = await Promise.all([
    prisma.subjectArea.findMany({
      orderBy: { id: 'asc' },
      include: {
        categories: {
          orderBy: { id: 'asc' },
          include: {
            skills: {
              orderBy: { name_en: 'asc' },
              include: { _count: { select: { students: true, jobPosts: true } } }
            }
          }
        }
      }
    }),
    prisma.category.findMany({
      where: { subjectAreaId: null },
      orderBy: { id: 'asc' },
      include: { skills: { orderBy: { name_en: 'asc' }, include: { _count: { select: { students: true, jobPosts: true } } } } }
    })
  ]);
  res.status(200).json({ areas, unassigned });
});

// ============ Subject areas ============

const createArea = handle('Create Area', async (req, res) => {
  const names = readNames(req.body);
  const area = await prisma.subjectArea.create({ data: names });
  await logAdminAction(req, { action: 'CATALOG_AREA_CREATED', targetType: 'SUBJECT_AREA', targetId: area.id, summary: `Added subject area ${describe(names)}` });
  res.status(201).json(area);
});

const updateArea = handle('Update Area', async (req, res) => {
  const names = readNames(req.body);
  const before = await prisma.subjectArea.findUniqueOrThrow({ where: { id: Number(req.params.id) } });
  const area = await prisma.subjectArea.update({ where: { id: before.id }, data: names });
  await logAdminAction(req, {
    action: 'CATALOG_AREA_UPDATED', targetType: 'SUBJECT_AREA', targetId: area.id,
    summary: `Edited subject area ${describe(names)}`, details: { before: pickNames(before), after: names }
  });
  res.status(200).json(area);
});

const deleteArea = handle('Delete Area', async (req, res) => {
  const area = await prisma.subjectArea.findUniqueOrThrow({
    where: { id: Number(req.params.id) }, include: { _count: { select: { categories: true } } }
  });
  if (area._count.categories > 0) {
    throw new CatalogError(409, 'This subject area still has fields of study. Move or delete them first.');
  }
  await prisma.subjectArea.delete({ where: { id: area.id } });
  await logAdminAction(req, { action: 'CATALOG_AREA_DELETED', targetType: 'SUBJECT_AREA', targetId: area.id, summary: `Deleted subject area "${area.name_en}"` });
  res.status(200).json({ message: 'Deleted.' });
});

// ============ Categories (fields of study) ============

async function readAreaId(body) {
  if (body.subjectAreaId === null || body.subjectAreaId === undefined || body.subjectAreaId === '') return null;
  const id = Number(body.subjectAreaId);
  const area = Number.isInteger(id) ? await prisma.subjectArea.findUnique({ where: { id } }) : null;
  if (!area) throw new CatalogError(400, 'That subject area does not exist.');
  return area.id;
}

const createCategory = handle('Create Category', async (req, res) => {
  const names = readNames(req.body);
  const subjectAreaId = await readAreaId(req.body);
  const category = await prisma.category.create({ data: { ...names, subjectAreaId } });
  await logAdminAction(req, { action: 'CATALOG_CATEGORY_CREATED', targetType: 'CATEGORY', targetId: category.id, summary: `Added field of study ${describe(names)}` });
  res.status(201).json(category);
});

const updateCategory = handle('Update Category', async (req, res) => {
  const names = readNames(req.body);
  const subjectAreaId = await readAreaId(req.body);
  const before = await prisma.category.findUniqueOrThrow({ where: { id: Number(req.params.id) } });
  const category = await prisma.category.update({ where: { id: before.id }, data: { ...names, subjectAreaId } });
  await logAdminAction(req, {
    action: 'CATALOG_CATEGORY_UPDATED', targetType: 'CATEGORY', targetId: category.id,
    summary: `Edited field of study ${describe(names)}`,
    details: { before: { ...pickNames(before), subjectAreaId: before.subjectAreaId }, after: { ...names, subjectAreaId } }
  });
  res.status(200).json(category);
});

const deleteCategory = handle('Delete Category', async (req, res) => {
  const category = await prisma.category.findUniqueOrThrow({
    where: { id: Number(req.params.id) }, include: { _count: { select: { skills: true } } }
  });
  if (category._count.skills > 0) {
    throw new CatalogError(409, 'This field of study still has skills. Move or delete them first.');
  }
  await prisma.category.delete({ where: { id: category.id } });
  await logAdminAction(req, { action: 'CATALOG_CATEGORY_DELETED', targetType: 'CATEGORY', targetId: category.id, summary: `Deleted field of study "${category.name_en}"` });
  res.status(200).json({ message: 'Deleted.' });
});

// ============ Skills ============

function pickNames(row) {
  return { name_en: row.name_en, name_ar: row.name_ar, name_ckb: row.name_ckb };
}

async function readCategoryId(body) {
  const id = Number(body.categoryId);
  const category = Number.isInteger(id) ? await prisma.category.findUnique({ where: { id } }) : null;
  if (!category) throw new CatalogError(400, 'Please choose a field of study for this skill.');
  return category.id;
}

// "Node.js", "NodeJS" and "node js" are the same skill; refuse near-identical names.
async function assertSkillNameFree(nameEn, exceptId = null) {
  const key = looseKey(nameEn);
  const all = await prisma.skill.findMany({ select: { id: true, name_en: true } });
  const clash = all.find((s) => s.id !== exceptId && looseKey(s.name_en) === key);
  if (clash) {
    throw new CatalogError(409, `"${clash.name_en}" is already in the catalog.`, { existingSkillId: clash.id });
  }
}

const createSkill = handle('Create Skill', async (req, res) => {
  const names = readNames(req.body);
  const categoryId = await readCategoryId(req.body);
  await assertSkillNameFree(names.name_en);
  const skill = await prisma.skill.create({ data: { ...names, categoryId } });
  await logAdminAction(req, { action: 'CATALOG_SKILL_CREATED', targetType: 'SKILL', targetId: skill.id, summary: `Added skill ${describe(names)}` });
  res.status(201).json(skill);
});

const updateSkill = handle('Update Skill', async (req, res) => {
  const names = readNames(req.body);
  const categoryId = await readCategoryId(req.body);
  const before = await prisma.skill.findUniqueOrThrow({ where: { id: Number(req.params.id) } });
  await assertSkillNameFree(names.name_en, before.id);
  const skill = await prisma.skill.update({ where: { id: before.id }, data: { ...names, categoryId } });
  await logAdminAction(req, {
    action: 'CATALOG_SKILL_UPDATED', targetType: 'SKILL', targetId: skill.id,
    summary: `Edited skill ${describe(names)}`,
    details: { before: { ...pickNames(before), categoryId: before.categoryId }, after: { ...names, categoryId } }
  });
  res.status(200).json(skill);
});

// Deleting a skill that students or jobs use needs explicit confirmation,
// since it silently drops it from their profiles. Merging is usually better.
const deleteSkill = handle('Delete Skill', async (req, res) => {
  const skill = await prisma.skill.findUniqueOrThrow({
    where: { id: Number(req.params.id) }, include: { _count: { select: { students: true, jobPosts: true } } }
  });
  const { students, jobPosts } = skill._count;
  if ((students > 0 || jobPosts > 0) && req.query.confirm !== 'true') {
    throw new CatalogError(409, 'This skill is in use. Merge it into another skill, or confirm to delete it anyway.', { students, jobPosts });
  }
  await prisma.skill.delete({ where: { id: skill.id } });
  await logAdminAction(req, {
    action: 'CATALOG_SKILL_DELETED', targetType: 'SKILL', targetId: skill.id,
    summary: `Deleted skill "${skill.name_en}"`, details: { ...pickNames(skill), removedFromStudents: students, removedFromJobs: jobPosts }
  });
  res.status(200).json({ message: 'Deleted.', students, jobPosts });
});

// Moves every student and job link from one skill to another, then deletes
// the old skill. Profiles or jobs that already have the target keep theirs.
const mergeSkill = handle('Merge Skill', async (req, res) => {
  const sourceId = Number(req.params.id);
  const targetId = Number(req.body.intoId);
  if (!Number.isInteger(targetId)) throw new CatalogError(400, 'Choose a skill to merge into.');
  if (sourceId === targetId) throw new CatalogError(400, 'Choose a different skill to merge into.');
  const [source, target] = await Promise.all([
    prisma.skill.findUniqueOrThrow({ where: { id: sourceId } }),
    prisma.skill.findUnique({ where: { id: targetId } })
  ]);
  if (!target) throw new CatalogError(400, 'The skill to merge into does not exist.');

  const [studentsWithTarget, jobsWithTarget] = await Promise.all([
    prisma.studentSkill.findMany({ where: { skillId: targetId }, select: { studentProfileId: true } }),
    prisma.jobPostSkill.findMany({ where: { skillId: targetId }, select: { jobPostId: true } })
  ]);
  const haveStudent = studentsWithTarget.map((s) => s.studentProfileId);
  const haveJob = jobsWithTarget.map((j) => j.jobPostId);

  const [movedStudents, movedJobs] = await prisma.$transaction([
    prisma.studentSkill.updateMany({ where: { skillId: sourceId, studentProfileId: { notIn: haveStudent } }, data: { skillId: targetId } }),
    prisma.jobPostSkill.updateMany({ where: { skillId: sourceId, jobPostId: { notIn: haveJob } }, data: { skillId: targetId } }),
    // Leftover links are duplicates of ones the target already has; the
    // skill delete cascades them away.
    prisma.skill.delete({ where: { id: sourceId } })
  ]);

  await logAdminAction(req, {
    action: 'CATALOG_SKILL_MERGED', targetType: 'SKILL', targetId: targetId,
    summary: `Merged skill "${source.name_en}" into "${target.name_en}"`,
    details: { from: { id: source.id, ...pickNames(source) }, movedStudents: movedStudents.count, movedJobs: movedJobs.count }
  });
  res.status(200).json({ message: 'Merged.', movedStudents: movedStudents.count, movedJobs: movedJobs.count });
});

module.exports = {
  getCatalog,
  createArea, updateArea, deleteArea,
  createCategory, updateCategory, deleteCategory,
  createSkill, updateSkill, deleteSkill, mergeSkill
};
