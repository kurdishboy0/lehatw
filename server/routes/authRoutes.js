const express = require('express');
const { 
  registerUser, 
  loginUser,
  googleLogin, 
  linkedinLogin, // <-- 1. Import the LinkedIn function
  forgotPassword, 
  verifyOTP, 
  resetPassword 
} = require('../controllers/authController');
const router = express.Router();

// Public Routes (Anyone can access)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/linkedin', linkedinLogin); // <-- 2. The new LinkedIn Route!

// Password Reset Routes (Public)
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;