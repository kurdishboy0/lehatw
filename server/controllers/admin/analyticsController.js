const prisma = require('../../db');

const DAY_MS = 24 * 60 * 60 * 1000;
// Days are counted in Iraq time (UTC+3, no daylight saving), so "today"
// matches what admins in Kurdistan see on their clocks.
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
const TREND_DAYS = 30;

const localDayKey = (date) => new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);

function startOfLocalDay(date) {
  const shifted = new Date(date.getTime() + TZ_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TZ_OFFSET_MS);
}

const liveJobWhere = { isActive: true, removedByAdmin: false };

const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const trendStart = new Date(startOfLocalDay(now).getTime() - (TREND_DAYS - 1) * DAY_MS);
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);

    const [
      students, companies, companiesApproved, jobsLive, jobsTotal, applications,
      needVerification, verified, recentUsers, applicationsThisWeek, applicationsLastWeek,
      pendingCompanies, pendingSkills, openReports, topJobs, demand
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'HR' } }),
      prisma.hRProfile.count({ where: { status: 'APPROVED' } }),
      prisma.jobPost.count({ where: liveJobWhere }),
      prisma.jobPost.count(),
      prisma.application.count(),
      // Accounts that signed up with a contact number must confirm their email.
      prisma.user.count({ where: { phone: { not: null }, role: { not: 'ADMIN' } } }),
      prisma.user.count({ where: { phone: { not: null }, phoneVerified: true, role: { not: 'ADMIN' } } }),
      prisma.user.findMany({ where: { createdAt: { gte: trendStart }, role: { in: ['STUDENT', 'HR'] } }, select: { createdAt: true, role: true } }),
      prisma.application.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.application.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
      prisma.hRProfile.count({ where: { status: 'PENDING' } }),
      prisma.customSkill.count({ where: { isApproved: false } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.jobPost.findMany({
        where: { applications: { some: {} } },
        orderBy: { applications: { _count: 'desc' } },
        take: 5,
        select: { id: true, title: true, isActive: true, removedByAdmin: true, hrProfile: { select: { companyName: true } }, _count: { select: { applications: true } } }
      }),
      prisma.jobPostSkill.groupBy({
        by: ['skillId'],
        where: { jobPost: liveJobWhere },
        _count: { skillId: true },
        orderBy: { _count: { skillId: 'desc' } },
        take: 10
      })
    ]);

    // Daily signups for the trend chart, split by account type.
    const days = [];
    for (let i = 0; i < TREND_DAYS; i++) {
      days.push({ date: localDayKey(new Date(trendStart.getTime() + i * DAY_MS)), students: 0, companies: 0 });
    }
    const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
    const week = { students: 0, companies: 0 };
    const lastWeek = { students: 0, companies: 0 };
    for (const u of recentUsers) {
      const bucket = u.role === 'STUDENT' ? 'students' : 'companies';
      if (byDate[localDayKey(u.createdAt)]) byDate[localDayKey(u.createdAt)][bucket] += 1;
      if (u.createdAt >= weekAgo) week[bucket] += 1;
      else if (u.createdAt >= twoWeeksAgo) lastWeek[bucket] += 1;
    }

    // Skills most requested by live job posts, next to how many students have them.
    const demandIds = demand.map((d) => d.skillId);
    const [skillRows, supply] = await Promise.all([
      prisma.skill.findMany({ where: { id: { in: demandIds } }, select: { id: true, name_en: true, name_ar: true, name_ckb: true } }),
      prisma.studentSkill.groupBy({ by: ['skillId'], where: { skillId: { in: demandIds } }, _count: { skillId: true } })
    ]);
    const skillById = Object.fromEntries(skillRows.map((s) => [s.id, s]));
    const supplyById = Object.fromEntries(supply.map((s) => [s.skillId, s._count.skillId]));

    res.status(200).json({
      totals: {
        students, companies, companiesApproved, jobsLive, jobsTotal, applications,
        verification: { needed: needVerification, verified, rate: needVerification ? verified / needVerification : null }
      },
      thisWeek: { signups: week, applications: applicationsThisWeek },
      lastWeek: { signups: lastWeek, applications: applicationsLastWeek },
      signupsByDay: days,
      topJobs: topJobs.map((j) => ({
        id: j.id, title: j.title, company: j.hrProfile.companyName,
        live: j.isActive && !j.removedByAdmin, applications: j._count.applications
      })),
      inDemandSkills: demand.map((d) => ({
        ...skillById[d.skillId], jobs: d._count.skillId, students: supplyById[d.skillId] || 0
      })),
      pending: { companies: pendingCompanies, skills: pendingSkills, reports: openReports }
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ message: 'Server error loading statistics.' });
  }
};

module.exports = { getAnalytics };
