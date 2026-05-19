const express = require('express');
const router = express.Router();
const crisisController = require('../controllers/crisisController');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

router.use(authMiddleware, tenantMiddleware);

router.get('/feed', crisisController.getFeed);
router.get('/:id', crisisController.getCrisisDetail);
router.get('/:id/contradictions', crisisController.getContradictions);

module.exports = router;
