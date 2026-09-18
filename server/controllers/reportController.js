const prisma = require('../db');
const { notifyAdmins } = require('../utils/notify');

const TARGET_TYPES = ['USER', 'MESSAGE', 'JOB'];
const REASONS = ['SPAM', 'SCAM', 'HARASSMENT', 'INAPPROPRIATE', 'FAKE_PROFILE', 'OTHER'];
const MAX_REPORTS_PER_DAY = 20;

// Loads the reported thing, checks the reporter is allowed to report it, and
// returns a text snapshot of it for the admin to review later.
async function resolveTarget(targetType, targetId, reporterId) {
  if (targetType === 'USER') {
    if (targetId === reporterId) return { error: [400, "You can't report yourself."] };
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { email: true, role: true, studentProfile: { select: { fullName: true } }, hrProfile: { select: { companyName: true } } }
    });
    if (!user) return { error: [404, 'User not found.'] };
    const name = user.studentProfile?.fullName || user.hrProfile?.companyName || user.email;
    return { snapshot: `${name} (${user.email}, ${user.role})` };
  }

  if (targetType === 'MESSAGE') {
    const message = await prisma.message.findUnique({
      where: { id: targetId },
      select: { content: true, recipientId: true, sender: { select: { email: true } } }
    });
    if (!message) return { error: [404, 'Message not found.'] };
    // Only the person who received a message can report it.
    if (message.recipientId !== reporterId) return { error: [403, 'You can only report messages sent to you.'] };
    return { snapshot: `From ${message.sender.email}: "${message.content}"` };
  }

  const job = await prisma.jobPost.findUnique({
    where: { id: targetId },
    select: { title: true, hrProfile: { select: { companyName: true } } }
  });
  if (!job) return { error: [404, 'Job post not found.'] };
  return { snapshot: `"${job.title}" by ${job.hrProfile.companyName}` };
}

const createReport = async (req, res) => {
  try {
    const targetType = req.body.targetType;
    const targetId = Number(req.body.targetId);
    const reason = req.body.reason;
    const details = (req.body.details || '').trim().slice(0, 1000) || null;

    if (!TARGET_TYPES.includes(targetType) || !Number.isInteger(targetId)) {
      return res.status(400).json({ message: 'Invalid report target.' });
    }
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ message: 'Please choose a reason.' });
    }

    const existing = await prisma.report.findFirst({
      where: { reporterId: req.user.id, targetType, targetId, status: 'OPEN' }
    });
    if (existing) {
      return res.status(200).json({ message: 'You already reported this. Our team will review it.', alreadyReported: true });
    }

    const recentCount = await prisma.report.count({
      where: { reporterId: req.user.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    });
    if (recentCount >= MAX_REPORTS_PER_DAY) {
      return res.status(429).json({ message: "You've sent a lot of reports today. Please try again tomorrow." });
    }

    const { error, snapshot } = await resolveTarget(targetType, targetId, req.user.id);
    if (error) return res.status(error[0]).json({ message: error[1] });

    const report = await prisma.report.create({
      data: { reporterId: req.user.id, targetType, targetId, targetSnapshot: snapshot, reason, details }
    });

    notifyAdmins({
      type: 'REPORT_FILED',
      title: `New report: ${reason.replace('_', ' ').toLowerCase()}`,
      body: snapshot.length > 140 ? `${snapshot.slice(0, 140)}...` : snapshot,
      link: '/admin-dashboard?tab=reports'
    });

    res.status(201).json({ message: 'Thanks. Our team will review this report.', reportId: report.id });
  } catch (error) {
    console.error('Create Report Error:', error);
    res.status(500).json({ message: 'Server error submitting report.' });
  }
};

module.exports = { createReport, REASONS };
