const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const prisma = require('../db');
const sendEmail = require('../utils/sendEmail');
const { normalizeEmail, isValidEmail } = require('../utils/emailAddress');
const { notifyAdmins } = require('../utils/notify');
const { getAccountBlock, blockedResponse } = require('../utils/accountStatus');

// --- NEW GOOGLE IMPORT ---
const { OAuth2Client } = require('google-auth-library');
const { generateOtp, hashOtp, otpExpiry, otpMatches, notExpired } = require('../utils/otpCodes');
const { invalidateUserCache } = require('../middleware/authMiddleware');
const { isValidPassword, PASSWORD_RULE_MESSAGE } = require('../utils/passwordPolicy');

// Matches the rule the set-password page already enforces.
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { getDisplayName } = require('../utils/displayName');

const registerUser = async (req, res) => {
  try {
    const { password, role, companyName, website, phone, address, taxId, personalPhone, fullName, headline, expertise, bio, linkedinUrl } = req.body;

    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    if (!isValidPassword(password)) return res.status(400).json({ message: PASSWORD_RULE_MESSAGE });
    const existingUser = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Students, companies and instructors may self-register; ADMIN accounts
    // can't be created through this endpoint.
    const finalRole = role === 'HR' ? 'HR' : role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT';
    if (finalRole === 'INSTRUCTOR' && !String(fullName || '').trim()) {
      return res.status(400).json({ message: "Please enter your full name." });
    }

    // Unverified contact information for recruiters; verification uses email.
    const verificationPhone = finalRole === 'HR' ? (phone || null) : (personalPhone || phone || null);

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

    // 2. Instructors get a profile that an admin reviews before they can teach
    if (finalRole === 'INSTRUCTOR') {
      await prisma.instructorProfile.create({
        data: {
          userId: newUser.id,
          fullName: String(fullName).trim(),
          headline: headline?.trim() || null,
          expertise: expertise?.trim() || null,
          bio: bio?.trim() || null,
          website: website?.trim() || null,
          linkedinUrl: linkedinUrl?.trim() || null,
          phone: verificationPhone
        }
      });
      notifyAdmins({
        type: 'INSTRUCTOR_PENDING',
        title: 'New instructor waiting for review',
        body: `${String(fullName).trim()} applied to teach on Lehatw.`,
        link: '/admin-dashboard?tab=approvals'
      });
    }

    // 3. Create the HR Profile using the newly generated User ID
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
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    if (typeof password !== 'string') return res.status(401).json({ message: 'Invalid credentials!' });

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user) {
      // Deliberately the same status and wording as a wrong password: a
      // different answer here would let anyone test which addresses have
      // accounts, one request at a time.
      return res.status(401).json({ message: "Invalid credentials!" });
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

    if (!user.phoneVerified) {
      return res.status(403).json({
        message: "Please verify your email to activate your account.",
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

    // Who the token was issued TO, not just who it belongs to. Asking the
    // userinfo endpoint alone answers "which Google user is this", and would
    // accept a token minted for somebody else's application entirely: anyone
    // running their own Google app could take a token their users handed them
    // and sign in here as those people. tokeninfo returns the audience, so we
    // can insist it is ours.
    const infoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token || '')}`);
    const info = await infoResponse.json();

    if (!infoResponse.ok) {
      return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
    }
    if (info.aud !== process.env.GOOGLE_CLIENT_ID) {
      console.warn('Google login rejected: token issued for another application.');
      return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
    }
    // An address Google has not confirmed must not be allowed to claim the
    // account that owns it here.
    if (String(info.email_verified) !== 'true') {
      return res.status(401).json({ message: 'Your Google email address is not verified.' });
    }

    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const googleUser = await googleResponse.json();

    if (!googleResponse.ok) {
      throw new Error('Failed to fetch user data from Google');
    }

    const { email, sub: googleId } = googleUser;
    // The profile call and the audience check must describe the same person.
    if (!email || (info.email && info.email !== email) || (info.sub && info.sub !== googleId)) {
      return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
    }

    let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

    if (user) {
      if (!user.googleId || !user.phoneVerified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, phoneVerified: true }
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          phoneVerified: true,
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

    const email = normalizeEmail(profileData.email);
    const linkedinId = typeof profileData.sub === 'string' ? profileData.sub.trim() : '';
    if (!isValidEmail(email) || !linkedinId || profileData.email_verified !== true) {
      return res.status(401).json({ message: 'LinkedIn authentication failed' });
    }

    // 3. Check or create the user in your database
    let user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

    if (user) {
      if (user.linkedinId && user.linkedinId !== linkedinId) {
        return res.status(401).json({ message: 'LinkedIn authentication failed' });
      }
      const block = getAccountBlock(user);
      if (block) return blockedResponse(res, block);
      if (!user.linkedinId || (!user.phoneVerified && profileData.email_verified === true)) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { linkedinId, ...(profileData.email_verified === true && { phoneVerified: true }) },
        });
      }
    } else {
      user = await prisma.user.create({
        data: { email, linkedinId, role: 'STUDENT', phoneVerified: profileData.email_verified === true },
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
    // A global configuration check gives the same answer for every address,
    // while avoiding a false "code sent" when mail is not configured at all.
    if (!sendEmail.isConfigured()) return res.status(503).json({ code: 'EMAIL_DELIVERY_UNAVAILABLE', message: 'Email delivery is temporarily unavailable.' });
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

    if (!user) {
      // Answer as though a code went out. Saying "no such account" here
      // would undo the same protection the sign-in form now has.
      return res.status(200).json({ message: "If this email exists, an OTP will be sent." });
    }

    const otp = generateOtp();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetOtp: hashOtp(otp),
        resetOtpExpires: otpExpiry(),
      },
    });

    const message = `Your password reset code is: ${otp}\n\nIt will expire in 15 minutes.`;
    // Sent in the background, for two reasons. An address with no account
    // answers immediately, so if this waited for the mail server the two
    // cases would still be told apart by how long the answer took. And the
    // person at the form shouldn't watch a spinner while Gmail is contacted.
    sendEmail(email, "Password Reset Code - Lehatw", message)
      .catch((err) => console.error('Forgot Password email failed:', err.message));

    res.status(200).json({ message: "If this email exists, an OTP will be sent." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Server error. Could not send OTP." });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

    if (!user || !otpMatches(otp, user.resetOtp) || !notExpired(user.resetOtpExpires)) {
      return res.status(400).json({ message: "Invalid or expired code. Please request a new one." });
    }

    res.status(200).json({ message: "OTP verified successfully!" });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Server error during verification." });
  }
};

// Sets a new password, and only for someone holding the code we emailed. The
// earlier version trusted the email address alone, which let anyone who knew
// an address take the account: the code is checked here, at the point the
// password actually changes, not only in the separate verify step the browser
// happens to call first.
const resetPassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_RULE_MESSAGE });
    }

    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    // One answer for a wrong code, an unknown address or an expired code, so
    // this can't be used to find out which addresses have accounts.
    if (!user || !otpMatches(otp, user.resetOtp) || !notExpired(user.resetOtpExpires)) {
      return res.status(400).json({ message: "Invalid or expired code. Please request a new one." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        resetOtp: null,
        resetOtpExpires: null,
      },
    });

    invalidateUserCache(user.id);
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
  const otp = generateOtp();
  await prisma.user.update({
    where: { id: user.id },
    data: { phoneOtp: hashOtp(otp), phoneOtpExpires: otpExpiry() }
  });
  return otp;
}

// Emails a fresh verification code. Also used by admins to resend one for a locked-out user.
async function sendVerificationEmail(user) {
  const otp = await issueVerificationCode(user);
  await sendEmail(user.email, "Verify your email - Lehatw", `Your verification code is: ${otp}\n\nIt will expire in 15 minutes.`);
}

// Sends or resends a 6-digit email verification code. The legacy route name
// is retained so existing clients continue to work.
const sendPhoneOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user) return res.status(400).json({ message: 'Unable to send a verification code. Please check your registration.' });
    if (user.phoneVerified) return res.status(400).json({ message: 'This email is already verified.' });
    // Account verification is email-only. A contact phone is never proof of
    // ownership of the account's email, including when a caller requests SMS.
    await sendVerificationEmail(user);
    res.status(200).json({ message: 'Verification code sent via email.' });
  } catch (error) {
    console.error("Send Phone OTP Error:", error);
    res.status(503).json({ code: 'EMAIL_DELIVERY_UNAVAILABLE', message: 'Email delivery is temporarily unavailable. Please try again later or contact support.' });
  }
};

const verifyPhoneOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

    if (!user || !otpMatches(otp, user.phoneOtp) || !notExpired(user.phoneOtpExpires)) {
      return res.status(400).json({ message: "Invalid or expired code. Please request a new one." });
    }

    const block = getAccountBlock(user);
    if (block) return blockedResponse(res, block);

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true, phoneOtp: null, phoneOtpExpires: null }
    });

    const token = jwt.sign(
      { id: verifiedUser.id, role: verifiedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    const name = await getDisplayName(verifiedUser);

    res.status(200).json({
      message: "Email verified! You're all set.",
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
