const prisma = require('../../db');

const PAGE_SIZE = 30;

// Filterable history of admin actions, newest first.
const listAudit = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const where = { AND: [] };
    if (req.query.action) where.AND.push({ action: String(req.query.action) });
    if (req.query.admin) where.AND.push({ adminEmail: String(req.query.admin) });
    if (req.query.targetType && req.query.targetId) {
      where.AND.push({ targetType: String(req.query.targetType), targetId: Number(req.query.targetId) });
    }
    const q = (req.query.q || '').trim();
    if (q) where.AND.push({ summary: { contains: q, mode: 'insensitive' } });
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if (from && !Number.isNaN(from.getTime())) where.AND.push({ createdAt: { gte: from } });
    if (to && !Number.isNaN(to.getTime())) where.AND.push({ createdAt: { lt: to } });

    const [total, entries, actions, admins] = await Promise.all([
      prisma.adminAuditLog.count({ where }),
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: { id: true, adminEmail: true, action: true, targetType: true, targetId: true, summary: true, details: true, createdAt: true }
      }),
      // Filter options: only values that actually occur.
      prisma.adminAuditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
      prisma.adminAuditLog.findMany({ distinct: ['adminEmail'], select: { adminEmail: true }, orderBy: { adminEmail: 'asc' } })
    ]);

    res.status(200).json({
      entries,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      filters: { actions: actions.map((a) => a.action), admins: admins.map((a) => a.adminEmail) }
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
    res.status(500).json({ message: 'Server error fetching the audit log.' });
  }
};

module.exports = { listAudit };
