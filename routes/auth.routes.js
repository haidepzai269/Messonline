const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth.controller');
const { sendResetCode, resetPassword } = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);

router.post('/send-reset-code', sendResetCode);
router.post('/reset-password', resetPassword);

module.exports = router;