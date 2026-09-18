const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const approvals = require('../controllers/admin/approvalsController');
const moderation = require('../controllers/admin/moderationController');
const overview = require('../controllers/admin/overviewController');

const router = express.Router();

// Every admin route requires a signed-in admin. Applied once here so a new
// route can't be added without it.
router.use(protect, adminOnly);

router.get('/pending-counts', overview.getPendingCounts);

// Company (HR) approvals
router.get('/companies', approvals.listCompanies);
router.put('/companies/:id/approve', approvals.approveCompany);
router.put('/companies/:id/reject', approvals.rejectCompany);

// Student-submitted custom skills
router.get('/custom-skills', approvals.listPendingSkills);
router.put('/custom-skills/:id/approve', approvals.approveCustomSkill);
router.put('/custom-skills/:id/reject', approvals.rejectCustomSkill);
router.put('/custom-skills/:id/merge', approvals.mergeCustomSkill);

// Job post moderation
router.get('/jobs', moderation.listJobs);
router.put('/jobs/:id/remove', moderation.removeJob);
router.put('/jobs/:id/restore', moderation.restoreJob);

// Reports
router.get('/reports', moderation.listReports);
router.put('/reports/:id', moderation.closeReport);
router.delete('/messages/:id', moderation.deleteMessage);

module.exports = router;
