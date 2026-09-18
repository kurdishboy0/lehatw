const express = require('express');
const { protect, adminOnly, superAdminOnly } = require('../middleware/authMiddleware');
const approvals = require('../controllers/admin/approvalsController');
const moderation = require('../controllers/admin/moderationController');
const users = require('../controllers/admin/usersController');
const overview = require('../controllers/admin/overviewController');
const catalog = require('../controllers/admin/catalogController');
const translations = require('../controllers/translationController');

const router = express.Router();

// Every admin route requires a signed-in admin. Applied once here so a new
// route can't be added without it.
router.use(protect, adminOnly);

router.get('/me', overview.getMe);
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

// Users
router.get('/users', users.listUsers);
router.get('/users/:id', users.getUser);
router.put('/users/:id/status', users.setStatus);
router.post('/users/:id/reset-password', users.resetPassword);
router.post('/users/:id/resend-verification', users.resendVerification);
router.put('/users/:id/verify', users.markVerified);
router.put('/users/:id/role', users.setRole);

// Skills catalog
router.get('/catalog', catalog.getCatalog);
router.post('/catalog/areas', catalog.createArea);
router.put('/catalog/areas/:id', catalog.updateArea);
router.delete('/catalog/areas/:id', catalog.deleteArea);
router.post('/catalog/categories', catalog.createCategory);
router.put('/catalog/categories/:id', catalog.updateCategory);
router.delete('/catalog/categories/:id', catalog.deleteCategory);
router.post('/catalog/skills', catalog.createSkill);
router.put('/catalog/skills/:id', catalog.updateSkill);
router.delete('/catalog/skills/:id', catalog.deleteSkill);
router.post('/catalog/skills/:id/merge', catalog.mergeSkill);

// Site text
router.get('/translations', translations.listOverrides);
router.put('/translations', translations.saveOverride);
router.post('/translations/reset', translations.resetOverride);

// Admin accounts (super-admin only)
router.get('/admins', superAdminOnly, users.listAdmins);
router.post('/admins', superAdminOnly, users.addAdmin);
router.put('/admins/:id/super', superAdminOnly, users.setSuperAdmin);
router.delete('/admins/:id', superAdminOnly, users.removeAdmin);

module.exports = router;
