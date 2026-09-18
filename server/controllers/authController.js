const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const prisma = require('../db');
const sendEmail = require('../utils/sendEmail');
const sendSms = require('../utils/sendSms');
const { notifyAdmins } = require('../utils/notify');
const { getAccountBlock, blockedResponse } = require('../utils/accountStatus');

// --- NEW GOOGLE IMPORT ---
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { getDisplayName } = require('../utils/displayName');

const registerUser = async (req, res) => {
  try {
    const { email, password, role, companyName, website, phone, address, taxId, personalPhone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Only STUDENT or HR may self-register; ADMIN accounts can't be created via this endpoint
    const finalRole = role === 'HR' ? 'HR' : 'STUDENT';

    // The contact number used for OTP verification: a student's own phone,
    // or the HR contact's phone number given on the company registration form.
    const verificationPhone = finalRole === 'STUDENT' ? (personalPhone || null) : (phone || null);

    let userData = {
      email: email,
      password: hashedPassword,
      role: finalRole,
      phone: verificationPhone,
    };

    // 1. Create the User FIRST so we have an ID to use
    const newUser = await prisma.user.create({
      data: userData,
    });

    // 2. Create the HR Profile SECOND using the newly generated User ID
    if (finalRole === 'HR') {
      await prisma.hRProfile.create({
        data: {
          userId: newUser.id,
          companyName: companyName || "Pending",
          industry: "Pending",
          jobTitle: "Pending",
          crNumber: "Pending",
          website: website || null,
          phone: phone || null,
          address: address || null,
          taxId: taxId || null
        }
      });

      notifyAdmins({
        type: 'HR_PENDING',
        title: 'New company account pending approval',
        body: `${companyName || newUser.email} signed up and is waiting for review.`,
        link: '/admin-dashboard?tab=approvals'
      });
    }

    res.status(201).json({
      message: "User registered successfully!",
      user: { id: newUser.id, email: newUser.email, role: newUser.role, phone: newUser.phone },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // --- SAFETY CHECK FOR SOCIAL LOGINS ---
    if (!user.password) {
       return res.status(401).json({ message: "This email is linked to a Google/LinkedIn account. Please use the social login button below." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials!" });
    }

    // Checked only after the password matches, so account status isn't
    // revealed to someone who doesn't own the account.
    const block = getAccountBlock(user);
    if (block) return blockedResponse(res, block);

    if (user.phone && !user.phoneVerified) {
      return res.status(403).json({
        message: "Please verify your phone number to activate your account.",
        code: "PHONE_NOT_VERIFIED",
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const name = await getDisplayName(user);

    res.status(200).json({
      message: "Logged in successfully!",
      token,
      user: { id: user.id, email: user.email, role: user.role, name }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};


// ==========================================
// GOOGLE SOCIAL LOGIN
// ==========================================
const googleLogin = async (req, res) => {
  try {
    const { token } = req.body; 

    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const googleUser = await googleResponse.json();

    if (!googleResponse.ok) {
      throw new Error('Failed to fetch user data from Google');
    }

    const { email, sub: googleId } = googleUser;

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId }
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          role: 'STUDENT',
        }
      });
    }

    const block = getAccountBlock(user);
    if (block) return blockedResponse(res, block);

    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const name = await getDisplayName(user);

    res.status(200).json({
      message: "Google login successful",
      token: jwtToken,
      user: { id: user.id, email: user.email, role: user.role, name }
    });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(401).json({ message: "Invalid Google Token" });
  }
};

// ==========================================
// NEW: LINKEDIN SOCIAL LOGIN
// ==========================================
const linkedinLogin = async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) return res.status(400).json({ message: "LinkedIn authentication failed" });

    // LinkedIn requires the exact redirect URI used when the user was sent to
    // it, which depends on the site the user is on (localhost or production).
    // LINKEDIN_REDIRECT_URI pins it when set; LinkedIn itself also rejects any
    // URI that isn't registered on the app.
    const redirect = process.env.LINKEDIN_REDIRECT_URI || redirectUri;
    if (!/^https?:\/\/[^\s/]+\/login$/.test(redirect || '')) {
      return res.status(400).json({ message: "LinkedIn authentication failed" });
    }

    // 1. Exchange the auth code for a LinkedIn access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error_description || 'Failed to get LinkedIn token');

    // 2. Fetch the user's profile using the OpenID endpoint
    const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await profileResponse.json();
    if (!profileResponse.ok) throw new Error('Failed to fetch user data');

    const { email, sub: linkedinId } = profileData;

    // 3. Check or create the user in your database
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      if (!user.linkedinId) {
        user = await prisma.user.update({
          where: { email },
          data: { linkedinId },
        });
      }
    } else {
      user = await prisma.user.create({
        data: { email, linkedinId, role: 'STUDENT' },
      });
    }

    const block = getAccountBlock(user);
    if (block) return blockedResponse(res, block);

    // 4. Generate your Lehatw JWT
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const name = await getDisplayName(user);

    res.status(200).json({
      message: "LinkedIn login successful",
      token: jwtToken,
      user: { id: user.id, email: user.email, role: user.role, name },
    });

  } catch (error) {
    console.error("LinkedIn Login Error:", error);
    res.status(401).json({ message: "LinkedIn authentication failed" });
  }
};


// ==========================================
// OTP & PASSWORD RESET FUNCTIONS
// ==========================================
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "If this email exists, an OTP will be sent." }); 
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: {
        resetOtp: otp,
        resetOtpExpires: otpExpires,
      },
    });

    const message = `Your password reset code is: ${otp}\n\nIt will expire in 15 minutes.`;
    await sendEmail(email, "Password Reset Code - Lehatw", message);

    res.status(200).json({ message: "OTP sent successfully!" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error. Could not send OTP." });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.resetOtp !== otp) {
      return res.status(400).json({ message: "Invalid code." });
    }

    if (user.resetOtpExpires < new Date()) {
      return res.status(400).json({ message: "Code has expired. Please request a new one." });
    }

    res.status(200).json({ message: "OTP verified successfully!" });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Server error during verification." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    res.status(200).json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error during password reset." });
  }
};

// ==========================================
// PHONE VERIFICATION (registration OTP)
// ==========================================

// Generates and stores a fresh 6-digit verification code for a user, valid 15 minutes.
async function issueVerificationCode(user) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.user.update({
    where: { id: user.id },
    data: { phoneOtp: otp, phoneOtpExpires: new Date(Date.now() + 15 * 60 * 1000) }
  });
  return otp;
}

// Emails a fresh verification code. Also used by admins to resend one for a locked-out user.
async function sendVerificationEmail(user) {
  const otp = await issueVerificationCode(user);
  await sendEmail(user.email, "Verify your email - Lehatw", `Your verification code is: ${otp}\n\nIt will expire in 15 minutes.`);
}

// Sends (or resends) a 6-digit code to verify the account, via email or SMS.
// Channel defaults to email since it needs no extra setup; SMS requires Twilio
// credentials to be configured on the server.
const sendPhoneOtp = async (req, res) => {
  try {
    const { email, channel } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.phone) {
      return res.status(404).json({ message: "No phone number on file for this account." });
    }
    if (user.phoneVerified) {
      return res.status(400).json({ message: "This phone number is already verified." });
    }

    if (channel !== 'sms') {
      await sendVerificationEmail(user);
      return res.status(200).json({ message: "Verification code sent via email." });
    }

    const otp = await issueVerificationCode(user);
    try {
      await sendSms(user.phone, `Your Lehatw verification code is: ${otp}. It expires in 15 minutes.`);
    } catch (smsError) {
      if (smsError.message === 'SMS_NOT_CONFIGURED') {
        return res.status(503).json({ message: "SMS delivery isn't set up on this server yet. Please use email instead." });
      }
      throw smsError;
    }

    res.status(200).json({ message: "Verification code sent via SMS." });
  } catch (error) {
    console.error("Send Phone OTP Error:", error);
    res.status(500).json({ message: "Server error. Could not send verification code." });
  }
};

const verifyPhoneOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.phoneOtp !== otp) {
      return res.status(400).json({ message: "Invalid code." });
    }
    if (!user.phoneOtpExpires || user.phoneOtpExpires < new Date()) {
      return res.status(400).json({ message: "Code has expired. Please request a new one." });
    }

    const block = getAccountBlock(user);
    if (block) return blockedResponse(res, block);

    const verifiedUser = await prisma.user.update({
      where: { email },
      data: { phoneVerified: true, phoneOtp: null, phoneOtpExpires: null }
    });

    const token = jwt.sign(
      { id: verifiedUser.id, role: verifiedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const name = await getDisplayName(verifiedUser);

    res.status(200).json({
      message: "Phone verified! You're all set.",
      token,
      user: { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role, name }
    });
  } catch (error) {
    console.error("Verify Phone OTP Error:", error);
    res.status(500).json({ message: "Server error during verification." });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleLogin,
  linkedinLogin,
  forgotPassword,
  verifyOTP,
  resetPassword,
  sendPhoneOtp,
  verifyPhoneOtp,
  sendVerificationEmail
};