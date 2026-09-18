const prisma = require('../../db');
const sendEmail = require('../../utils/sendEmail');
const { notifyUser } = require('../../utils/notify');
const { logAdminAction } = require('../../utils/audit');
const { looseKey, suggestSimilarSkills } = require('../../utils/skillText');

const MIN_REASON_LENGTH = 5;

function emailQuietly(to, subject, text) {
  sendEmail(to, subject, text).catch((err) => console.error('Admin notification email failed (non-fatal):', err));
}

// ============ Company (HR) accounts ============

const listCompanies = async (req, res) => {
  try {
    const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status) ? req.query.status : 'PENDING';
    const companies = await prisma.hRProfile.findMany({
      where: { status },
      include: { user: { select: { id: true, email: true, createdAt: true, phone: true, accountStatus: true } } },
      orderBy: { user: { createdAt: 'desc' } }
    });
    res.status(200).json(companies);
  } catch (error) {
    console.error('List Companies Error:', error);
    res.status(500).json({ message: 'Server error fetching companies.' });
  }
};

const approveCompany = async (req, res) => {
  try {
    const profile = await prisma.hRProfile.update({
      where: { id: Number(req.params.id) },
      data: { status: 'APPROVED', rejectionReason: null },
      include: { user: { select: { email: true } } }
    });

    notifyUser(profile.userId, {
      type: 'HR_APPROVED',
      title: 'Your company account was approved',
      body: 'You can now post jobs and browse student talent.',
      link: '/hr-dashboard'
    });
    emailQuietly(profile.user.email, 'Your Lehatw company account is approved',
      `Good news: ${profile.companyName} has been approved on Lehatw.\n\nYou can now log in, post jobs, and browse student talent.`);

    await logAdminAction(req, {
      action: 'COMPANY_APPROVED', targetType: 'HR_PROFILE', targetId: profile.id,
      summary: `Approved company "${profile.companyName}" (${profile.user.email})`
    });
    res.status(200).json({ message: 'Company approved.', profile });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Company not found.' });
    console.error('Approve Company Error:', error);
    res.status(500).json({ message: 'Server error approving company.' });
  }
};

const rejectCompany = async (req, res) => {
  try {
    const reason = (req.body.reason || '').trim();
    if (reason.length < MIN_REASON_LENGTH) {
      return res.status(400).json({ message: 'Please give the company a reason so they know what to fix.' });
    }

    const profile = await prisma.hRProfile.update({
      where: { id: Number(req.params.id) },
      data: { status: 'REJECTED', rejectionReason: reason },
      include: { user: { select: { email: true } } }
    });

    notifyUser(profile.userId, {
      type: 'HR_REJECTED',
      title: 'Your company account needs changes',
      body: reason,
      link: '/hr-dashboard'
    });
    emailQuietly(profile.user.email, 'Your Lehatw company account was not approved',
      `Your company account for ${profile.companyName} was not approved yet.\n\nReason: ${reason}\n\nYou can update your company details from your dashboard to resubmit it for review.`);

    await logAdminAction(req, {
      action: 'COMPANY_REJECTED', targetType: 'HR_PROFILE', targetId: profile.id,
      summary: `Rejected company "${profile.companyName}" (${profile.user.email})`,
      details: { reason }
    });
    res.status(200).json({ message: 'Company rejected.', profile });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Company not found.' });
    console.error('Reject Company Error:', error);
    res.status(500).json({ message: 'Server error rejecting company.' });
  }
};

// ============ Custom skills ============

const listPendingSkills = async (req, res) => {
  try {
    const [pending, catalog] = await Promise.all([
      prisma.customSkill.findMany({
        where: { isApproved: false },
        include: { studentProfile: { select: { fullName: true, userId: true } } },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.skill.findMany({ select: { id: true, name_en: true, category: { select: { name_en: true } } } })
    ]);

    // How many students submitted the same name, so the admin can merge them all at once.
    const countByKey = pending.reduce((acc, s) => {
      const key = looseKey(s.name);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const withSuggestions = pending.map((s) => ({
      ...s,
      sameNameCount: countByKey[looseKey(s.name)],
      suggestions: suggestSimilarSkills(s.name, catalog).map((m) => ({
        id: m.id, name_en: m.name_en, category: m.category?.name_en, exactMatch: m.exactMatch
      }))
    }));
    res.status(200).json(withSuggestions);
  } catch (error) {
    console.error('List Pending Skills Error:', error);
    res.status(500).json({ message: 'Server error fetching pending skills.' });
  }
};

const approveCustomSkill = async (req, res) => {
  try {
    const skill = await prisma.customSkill.update({
      where: { id: Number(req.params.id) },
      data: { isApproved: true },
      include: { studentProfile: { select: { userId: true, fullName: true } } }
    });
    notifyUser(skill.studentProfile.userId, {
      type: 'SKILL_APPROVED', title: 'Skill approved',
      body: `"${skill.name}" was approved and now shows on your profile.`, link: '/student-dashboard'
    });
    await logAdminAction(req, {
      action: 'CUSTOM_SKILL_APPROVED', targetType: 'CUSTOM_SKILL', targetId: skill.id,
      summary: `Approved custom skill "${skill.name}" for ${skill.studentProfile.fullName}`
    });
    res.status(200).json({ message: 'Skill approved.' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Skill not found.' });
    console.error('Approve Custom Skill Error:', error);
    res.status(500).json({ message: 'Server error approving skill.' });
  }
};

const rejectCustomSkill = async (req, res) => {
  try {
    const reason = (req.body.reason || '').trim();
    const skill = await prisma.customSkill.findUnique({
      where: { id: Number(req.params.id) },
      include: { studentProfile: { select: { userId: true, fullName: true } } }
    });
    if (!skill) return res.status(404).json({ message: 'Skill not found.' });

    await prisma.customSkill.delete({ where: { id: skill.id } });
    notifyUser(skill.studentProfile.userId, {
      type: 'SKILL_REJECTED', title: 'Skill not approved',
      body: reason ? `"${skill.name}" wasn't approved: ${reason}` : `"${skill.name}" wasn't approved and was removed from your pending skills.`,
      link: '/student-dashboard'
    });
    await logAdminAction(req, {
      action: 'CUSTOM_SKILL_REJECTED', targetType: 'CUSTOM_SKILL', targetId: skill.id,
      summary: `Rejected custom skill "${skill.name}" for ${skill.studentProfile.fullName}`,
      details: reason ? { reason } : null
    });
    res.status(200).json({ message: 'Skill rejected.' });
  } catch (error) {
    console.error('Reject Custom Skill Error:', error);
    res.status(500).json({ message: 'Server error rejecting skill.' });
  }
};

// Merges a student-typed skill into an existing catalog skill: the student gets
// the real catalog skill instead (so they show up in matching and filters) and
// the custom entry is removed. With applyToAll, every pending entry that is the
// same skill under a different spelling ("NodeJS", "node js") is merged too.
const mergeCustomSkill = async (req, res) => {
  try {
    const targetSkillId = Number(req.body.skillId);
    const applyToAll = Boolean(req.body.applyToAll);

    const [custom, target] = await Promise.all([
      prisma.customSkill.findUnique({ where: { id: Number(req.params.id) } }),
      prisma.skill.findUnique({ where: { id: targetSkillId } })
    ]);
    if (!custom) return res.status(404).json({ message: 'Custom skill not found.' });
    if (!target) return res.status(400).json({ message: 'Choose an existing catalog skill to merge into.' });

    let toMerge = [custom];
    if (applyToAll) {
      const key = looseKey(custom.name);
      const others = await prisma.customSkill.findMany({ where: { isApproved: false, NOT: { id: custom.id } } });
      toMerge = toMerge.concat(others.filter((s) => looseKey(s.name) === key));
    }

    const profileIds = [...new Set(toMerge.map((s) => s.studentProfileId))];
    const alreadyHave = await prisma.studentSkill.findMany({
      where: { skillId: target.id, studentProfileId: { in: profileIds } },
      select: { studentProfileId: true }
    });
    const haveSet = new Set(alreadyHave.map((s) => s.studentProfileId));

    await prisma.$transaction([
      prisma.studentSkill.createMany({
        data: profileIds.filter((id) => !haveSet.has(id)).map((studentProfileId) => ({
          studentProfileId, skillId: target.id, proficiency: 'Intermediate'
        }))
      }),
      prisma.customSkill.deleteMany({ where: { id: { in: toMerge.map((s) => s.id) } } })
    ]);

    const profiles = await prisma.studentProfile.findMany({ where: { id: { in: profileIds } }, select: { userId: true } });
    for (const p of profiles) {
      notifyUser(p.userId, {
        type: 'SKILL_APPROVED', title: 'Skill added to your profile',
        body: `"${custom.name}" was matched to "${target.name_en}" in the skills catalog.`, link: '/student-dashboard'
      });
    }

    await logAdminAction(req, {
      action: 'CUSTOM_SKILL_MERGED', targetType: 'SKILL', targetId: target.id,
      summary: `Merged ${toMerge.length} custom "${custom.name}" entr${toMerge.length === 1 ? 'y' : 'ies'} into catalog skill "${target.name_en}"`,
      details: { mergedNames: [...new Set(toMerge.map((s) => s.name))], students: profileIds.length }
    });
    res.status(200).json({ message: 'Merged.', mergedCount: toMerge.length, studentsUpdated: profileIds.length });
  } catch (error) {
    console.error('Merge Custom Skill Error:', error);
    res.status(500).json({ message: 'Server error merging skill.' });
  }
};

module.exports = {
  listCompanies, approveCompany, rejectCompany,
  listPendingSkills, approveCustomSkill, rejectCustomSkill, mergeCustomSkill
};
