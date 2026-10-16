const express = require('express');
const { checkSetupToken, completeSetup } = require('../controllers/accountSetupController');
const {
  registerUser,
  loginUser,
  googleLogin,
  linkedinLogin, // <-- 1. Import the LinkedIn function
  forgotPassword,
  verifyOTP,
  resetPassword,
  sendPhoneOtp,
  verifyPhoneOtp
} = require('../controllers/authController');
const { loginLimiter, codeCheckLimiter, codeSendLimiter, registerLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Public Routes (Anyone can access)
router.post('/register', registerLimiter, registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/google', googleLogin);
router.post('/linkedin', linkedinLogin); // <-- 2. The new LinkedIn Route!

// Password Reset Routes (Public)
router.post('/forgot-password', codeSendLimiter, forgotPassword);
router.post('/verify-otp', codeCheckLimiter, verifyOTP);
router.post('/reset-password', codeCheckLimiter, resetPassword);

// Phone verification (registration) Routes (Public)
router.post('/send-phone-otp', codeSendLimiter, sendPhoneOtp);
router.post('/verify-phone-otp', codeCheckLimiter, verifyPhoneOtp);

// Admin-created accounts choose their own password through a one-time link
router.get('/setup/:token', checkSetupToken);
router.post('/setup', codeCheckLimiter, completeSetup);

module.exports = router;