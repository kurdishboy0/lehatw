const prisma = require('../db');
const { matchJob, byMatch } = require('../utils/jobMatch');
const { notifyUser } = require('../utils/notify');
const sendEmail = require('../utils/sendEmail');

const { openJobWhere, isJobOpen } = require('../utils/jobDeadline');
const MAX_INVITE_MESSAGE = 2000;

// ============ Students: how well each live job fits me ============

const getMyJobMatches = async (req, res) => {
  try {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ message: 'Only talent get job recommendations.' });
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      select: { id: true, skills: { select: { skillId: true, proficiency: true } } }
    });
    if (!profile) return res.status(404).json({ message: 'Please complete your profile first.' });

    const [jobs, applications, invitations] = await Promise.all([
      prisma.jobPost.findMany({ where: openJobWhere(), select: { id: true, skills: { select: { skillId: true } } } }),
      prisma.application.findMany({ where: { studentId: req.user.id }, select: { jobPostId: true } }),
      prisma.jobInvitation.findMany({ where: { studentProfileId: profile.id }, select: { jobPostId: true } })
    ]);

    const matches = {};
    for (const job of jobs) {
      if (job.skills.length === 0) continue; // nothing to match against
      const { proficiency, ...match } = matchJob(profile.skills, job.skills.map((s) => s.skillId));
      matches[job.id] = { ...match, proficiency };
    }

    res.status(200).json({
      hasSkills: profile.skills.length > 0,
      matches,
      appliedJobIds: applications.map((a) => a.jobPostId),
      invitedJobIds: invitations.map((i) => i.jobPostId)
    });
  } catch (error) {
    console.error('Job Matches Error:', error);
    res.status(500).json({ message: 'Server error computing job matches.' });
  }
};

// ============ Companies: candidates for one of my jobs ============

async function loadOwnJob(req, res) {
  const job = await prisma.jobPost.findUnique({
    where: { id: Number(req.params.jobId) },
    include: { hrProfile: { select: { userId: true, companyName: true } }, skills: { include: { skill: true } } }
  });
  if (!job) {
    res.status(404).json({ message: 'Job not found.' });
    return null;
  }
  const isOwner = req.user.role === 'HR' && job.hrProfile.userId === req.user.id;
  if (!isOwner && req.user.role !== 'ADMIN') {
    res.status(403).json({ message: 'You can only see candidates for your own job posts.' });
    return null;
  }
  return job;
}

// Every active student with at least one of the job's skills, best first.
// The page filters by its own threshold, so the slider needs no round trip.
const getJobCandidates = async (req, res) => {
  try {
    const job = await loadOwnJob(req, res);
    if (!job) return;
    const jobSkillIds = job.skills.map((s) => s.skillId);
    const summary = {
      id: job.id, title: job.title, company: job.hrProfile.companyName, live: isJobOpen(job),
      skills: job.skills.map((s) => ({ id: s.skill.id, name_en: s.skill.name_en, name_ar: s.skill.name_ar, name_ckb: s.skill.name_ckb }))
    };
    if (jobSkillIds.length === 0) return res.status(200).json({ job: summary, candidates: [] });

    const [profiles, applications, invitations] = await Promise.all([
      prisma.studentProfile.findMany({
        where: { skills: { some: { skillId: { in: jobSkillIds } } }, user: { accountStatus: 'ACTIVE' } },
        include: {
          user: { select: { id: true, email: true, phone: true, phoneVerified: true } },
          skills: { include: { skill: { select: { id: true, name_en: true, name_ar: true, name_ckb: true } } } },
          customSkills: { where: { isApproved: true }, select: { name: true } }
        }
      }),
      prisma.application.findMany({ where: { jobPostId: job.id }, select: { studentId: true } }),
      prisma.jobInvitation.findMany({ where: { jobPostId: job.id }, select: { studentProfileId: true, createdAt: true } })
    ]);
    const applied = new Set(applications.map((a) => a.studentId));
    const invited = new Map(invitations.map((i) => [i.studentProfileId, i.createdAt]));

    const candidates = profiles
      .map((p) => ({
        id: p.id,
        userId: p.user.id,
        fullName: p.fullName,
        photoUrl: p.photoUrl,
        university: p.university,
        fieldOfStudy: p.fieldOfStudy,
        graduationYear: p.graduationYear,
        // Companies may contact candidates; the phone was never verified.
        email: p.user.email,
        phone: p.user.phone,
        skills: p.skills.map((s) => ({ ...s.skill, proficiency: s.proficiency })),
        customSkills: p.customSkills.map((c) => c.name),
        match: matchJob(p.skills, jobSkillIds),
        applied: applied.has(p.user.id),
        invitedAt: invited.get(p.id) || null
      }))
      .sort(byMatch);

    res.status(200).json({ job: summary, candidates });
  } catch (error) {
    console.error('Job Candidates Error:', error);
    res.status(500).json({ message: 'Server error finding candidates.' });
  }
};

// Invites a student to apply: a message in their inbox plus a notification
// linking to the job. Once per student per job.
const inviteCandidate = async (req, res) => {
  try {
    if (req.user.role !== 'HR') return res.status(403).json({ message: 'Only companies can invite candidates.' });
    const job = await loadOwnJob(req, res);
    if (!job) return;
    if (!isJobOpen(job)) {
      return res.status(400).json({ message: 'This job post is not live, so talent can\'t apply to it.' });
    }

    const text = String(req.body.message || '').trim();
    if (!text) return res.status(400).json({ message: 'Please write a short message to the talent.' });
    if (text.length > MAX_INVITE_MESSAGE) return res.status(400).json({ message: `Messages can be at most ${MAX_INVITE_MESSAGE} characters.` });

    const profile = await prisma.studentProfile.findUnique({
      where: { id: Number(req.body.studentProfileId) },
      select: { id: true, fullName: true, user: { select: { id: true, email: true, accountStatus: true } } }
    });
    if (!profile || profile.user.accountStatus !== 'ACTIVE') return res.status(404).json({ message: 'Talent not found.' });

    const alreadyApplied = await prisma.application.findFirst({ where: { jobPostId: job.id, studentId: profile.user.id }, select: { id: true } });
    if (alreadyApplied) return res.status(409).json({ message: 'This talent has already applied to this job.' });

    try {
      await prisma.$transaction([
        prisma.jobInvitation.create({ data: { jobPostId: job.id, studentProfileId: profile.id } }),
        prisma.message.create({ data: { senderId: req.user.id, recipientId: profile.user.id, content: text } })
      ]);
    } catch (error) {
      if (error.code === 'P2002') return res.status(409).json({ message: 'You already invited this talent to this job.' });
      throw error;
    }

    notifyUser(profile.user.id, {
      type: 'JOB_INVITE',
      title: `${job.hrProfile.companyName} invited you to apply`,
      body: job.title,
      link: `/jobs/${job.id}`
    });
    res.status(201).json({ message: 'Invitation sent.', invitedAt: new Date().toISOString() });

    // Also email the student, after responding so a slow mail server never
    // delays the company's confirmation. The link uses CLIENT_URL when set,
    // otherwise the site the company is using.
    const siteUrl = process.env.CLIENT_URL || req.get('origin');
    const jobLink = /^https?:\/\/[^\s/]+$/.test(siteUrl || '') ? `${siteUrl}/jobs/${job.id}` : null;
    sendEmail(
      profile.user.email,
      `${job.hrProfile.companyName} invited you to apply on Lehatw`,
      `${job.hrProfile.companyName} invited you to apply for "${job.title}".\n\n"${text}"\n\n`
        + (jobLink ? `See the job and apply: ${jobLink}` : 'Log in to Lehatw to see the job and apply.')
    ).catch((error) => console.error('Invite email failed (non-fatal):', error));
  } catch (error) {
    console.error('Invite Candidate Error:', error);
    res.status(500).json({ message: 'Server error sending the invitation.' });
  }
};

module.exports = { getMyJobMatches, getJobCandidates, inviteCandidate };
