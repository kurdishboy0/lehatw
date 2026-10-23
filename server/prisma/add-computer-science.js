// Additive, manually invoked catalog patch. Existing skill IDs and selections stay intact.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const entry = require('./computer-science-data');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$transaction(async tx => {
    let area = await tx.subjectArea.findFirst({ where: { name_en: 'Computer Science & IT' } });
    if (!area) area = await tx.subjectArea.create({ data: { name_en: 'Computer Science & IT', name_ar: 'علوم الحاسوب وتقنية المعلومات', name_ckb: 'زانستی کۆمپیوتەر و تەکنەلۆجیای زانیاری' } });
    let category = await tx.category.findFirst({ where: { name_en: entry.en } });
    if (!category) category = await tx.category.create({ data: { name_en: entry.en, name_ar: entry.ar, name_ckb: entry.ckb, subjectAreaId: area.id } });
    let added = 0;
    for (const skill of entry.skills) {
      const exists = await tx.skill.findFirst({ where: { categoryId: category.id, name_en: skill.en } });
      if (!exists) { await tx.skill.create({ data: { categoryId: category.id, name_en: skill.en, name_ar: skill.ar, name_ckb: skill.ckb } }); added++; }
    }
    return { categoryId: category.id, skillsAdded: added };
  }, { timeout: 30000 });
  console.log(JSON.stringify(result));
}
main().catch(() => { console.error('Computer Science catalog update failed.'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
