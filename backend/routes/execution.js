const express = require('express');
const router = express.Router();
const executionController = require('../controllers/executionController');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

router.use(authMiddleware, tenantMiddleware);

router.get('/plan', executionController.getActionPlan);
router.get('/outcomes', executionController.getOutcomes);

module.exports = router;
