const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

router.use(authMiddleware, tenantMiddleware);

router.get('/director', dashboardController.getDirectorDashboard);
router.get('/settings', dashboardController.getSettings);
router.get('/traces', dashboardController.getTraces);

module.exports = router;
