const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const authMiddleware = require('../middleware/authMiddleware');
const tenantMiddleware = require('../middleware/tenantMiddleware');

router.use(authMiddleware, tenantMiddleware);

router.get('/feed', dataController.getFeed);
router.get('/crisis/:id', dataController.getCrisisDetail);

module.exports = router;
