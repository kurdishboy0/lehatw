const prisma = require('../../db');
const sendEmail = require('../../utils/sendEmail');
const { notifyUser } = require('../../utils/notify');
const { logAdminAction } = require('../../utils/audit');

const PAGE_SIZE = 20;

function emailQuietly(to, subject, text) {
  sendEmail(to, subject, text).catch((err) => console.error('Admin notification email failed (non-fatal):', err));
}

// ============ Job posts ============

const listJobs = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const q = (req.query.q || '').trim();
    const where = {};
    if (req.query.status === 'active') Object.assign(where, { isActive: true });
    if (req.query.status === 'inactive') Object.assign(where, { isActive: false, removedByAdmin: false });
    if (req.query.status === 'removed') Object.assign(where, { removedByAdmin: true });
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { hrProfile: { companyName: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [total, jobs] = await Promise.all([
      prisma.jobPost.count({ where }),
      prisma.jobPost.findMany({
        where,
        include: {
          hrProfile: { select: { companyName: true, user: { select: { email: true } } } },
          _count: { select: { applications: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE
      })
    ]);

    // Open reports per job, so suspicious posts stand out in the list.
    const openReports = await prisma.report.groupBy({
      by: ['targetId'],
      where: { targetType: 'JOB', status: 'OPEN', targetId: { in: jobs.map((j) => j.id) } },
      _count: { _all: true }
    });
    const reportsByJob = Object.fromEntries(openReports.map((r) => [r.targetId, r._count._all]));

    res.status(200).json({
      jobs: jobs.map((j) => ({ ...j, openReportCount: reportsByJob[j.id] || 0 })),
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE))
    });
  } catch (error) {
    console.error('Admin List Jobs Error:', error);
    res.status(500).json({ message: 'Server error fetching job posts.' });
  }
};

const removeJob = async (req, res) => {
  try {
    const reason = (req.body.reason || '').trim();
    if (reason.length < 5) {
      return res.status(400).json({ message: 'Please give a reason for taking this post down.' });
    }

    const job = await prisma.jobPost.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false, removedByAdmin: true, removedReason: reason, removedAt: new Date() },
      include: { hrProfile: { select: { userId: true, companyName: true, user: { select: { email: true } } } } }
    });

    notifyUser(job.hrProfile.userId, {
      type: 'JOB_REMOVED', title: 'A job post was taken down',
      body: `"${job.title}" was removed by an admin: ${reason}`, link: '/hr-dashboard'
    });
    emailQuietly(job.hrProfile.user.email, 'A Lehatw job post was taken down',
      `Your job post "${job.title}" was removed by a Lehatw admin.\n\nReason: ${reason}\n\nIf you think this is a mistake, reply to this email or contact us through the website.`);

    await logAdminAction(req, {
      action: 'JOB_REMOVED', targetType: 'JOB', targetId: job.id,
      summary: `Took down job "${job.title}" by ${job.hrProfile.companyName}`,
      details: { reason }
    });
    res.status(200).json({ message: 'Job post taken down.', job });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Job post not found.' });
    console.error('Remove Job Error:', error);
    res.status(500).json({ message: 'Server error taking down job post.' });
  }
};

const restoreJob = async (req, res) => {
  try {
    const job = await prisma.jobPost.update({
      where: { id: Number(req.params.id) },
      data: { isActive: true, removedByAdmin: false, removedReason: null, removedAt: null },
      include: { hrProfile: { select: { userId: true, companyName: true } } }
    });
    notifyUser(job.hrProfile.userId, {
      type: 'JOB_RESTORED', title: 'A job post was restored',
      body: `"${job.title}" is live again.`, link: '/hr-dashboard'
    });
    await logAdminAction(req, {
      action: 'JOB_RESTORED', targetType: 'JOB', targetId: job.id,
      summary: `Restored job "${job.title}" by ${job.hrProfile.companyName}`
    });
    res.status(200).json({ message: 'Job post restored.', job });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Job post not found.' });
    console.error('Restore Job Error:', error);
    res.status(500).json({ message: 'Server error restoring job post.' });
  }
};

// ============ Reports ============

// Current state of whatever each report points at, so the admin sees whether
// the user is already banned, the job already down, or the message deleted.
async function attachTargets(reports) {
  const idsOf = (type) => [...new Set(reports.filter((r) => r.targetType === type).map((r) => r.targetId))];
  const [users, messages, jobs] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: idsOf('USER') } },
      select: { id: true, email: true, role: true, accountStatus: true, studentProfile: { select: { id: true, fullName: true } }, hrProfile: { select: { companyName: true } } }
    }),
    prisma.message.findMany({
      where: { id: { in: idsOf('MESSAGE') } },
      select: { id: true, content: true, createdAt: true, sender: { select: { id: true, email: true, accountStatus: true } } }
    }),
    prisma.jobPost.findMany({
      where: { id: { in: idsOf('JOB') } },
      select: { id: true, title: true, isActive: true, removedByAdmin: true, hrProfile: { select: { companyName: true } } }
    })
  ]);
  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  const maps = { USER: byId(users), MESSAGE: byId(messages), JOB: byId(jobs) };
  return reports.map((r) => ({ ...r, target: maps[r.targetType][r.targetId] || null }));
}

const listReports = async (req, res) => {
  try {
    const status = ['OPEN', 'RESOLVED', 'DISMISSED'].includes(req.query.status) ? req.query.status : 'OPEN';
    const reports = await prisma.report.findMany({
      where: { status },
      include: {
        reporter: { select: { id: true, email: true } },
        resolvedBy: { select: { email: true } }
      },
      orderBy: { createdAt: status === 'OPEN' ? 'asc' : 'desc' },
      take: 100
    });
    res.status(200).json(await attachTargets(reports));
  } catch (error) {
    console.error('List Reports Error:', error);
    res.status(500).json({ message: 'Server error fetching reports.' });
  }
};

const closeReport = async (req, res) => {
  try {
    const status = req.body.status;
    if (!['RESOLVED', 'DISMISSED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be RESOLVED or DISMISSED.' });
    }
    const note = (req.body.note || '').trim() || null;
    const report = await prisma.report.update({
      where: { id: Number(req.params.id) },
      data: { status, resolutionNote: note, resolvedById: req.user.id, resolvedAt: new Date() }
    });
    await logAdminAction(req, {
      action: status === 'RESOLVED' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      targetType: 'REPORT', targetId: report.id,
      summary: `${status === 'RESOLVED' ? 'Resolved' : 'Dismissed'} report #${report.id} (${report.targetType.toLowerCase()} #${report.targetId}, ${report.reason})`,
      details: note ? { note } : null
    });
    res.status(200).json({ message: 'Report closed.', report });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Report not found.' });
    console.error('Close Report Error:', error);
    res.status(500).json({ message: 'Server error updating report.' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: Number(req.params.id) },
      include: { sender: { select: { email: true } }, recipient: { select: { email: true } } }
    });
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    await prisma.message.delete({ where: { id: message.id } });
    await logAdminAction(req, {
      action: 'MESSAGE_DELETED', targetType: 'MESSAGE', targetId: message.id,
      summary: `Deleted a message from ${message.sender.email} to ${message.recipient.email}`,
      details: { content: message.content }
    });
    res.status(200).json({ message: 'Message deleted.' });
  } catch (error) {
    console.error('Delete Message Error:', error);
    res.status(500).json({ message: 'Server error deleting message.' });
  }
};

module.exports = { listJobs, removeJob, restoreJob, listReports, closeReport, deleteMessage };
