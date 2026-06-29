const express = require('express');
const authController = require('../controllers/authController');
const { protectUser } = require('../middleware/auth');

const router = express.Router();

router.post('/google', authController.googleLogin);
router.get('/me', protectUser, authController.getMe);
router.patch('/preferences', protectUser, authController.updatePreferences);
router.patch('/fcm-token', protectUser, authController.updateFcmToken);
module.exports = router;
