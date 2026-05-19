const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/signup', authController.signupOrganization);
router.post('/login', authController.login);
router.post('/sso', authController.ssoLogin);
router.get('/users', authMiddleware, authController.getUsers);
router.post('/create-user', authMiddleware, authController.createUser);
router.post('/resend-credentials/:userId', authMiddleware, authController.resendCredentials);

module.exports = router;
