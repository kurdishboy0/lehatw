const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Limits on the endpoints anyone can call without signing in.
//
// Two different abuses are being stopped. Guessing: a password or a six-digit
// code is cheap to try thousands of times, and one million combinations is a
// short afternoon without a cap. Flooding: forgot-password and the code
// resend both send mail (and SMS), so an open endpoint is a way to fill
// someone's inbox and spend the project's Twilio credit.
//
// Account and address limits are independent: changing addresses must not
// reset the allowance for one account. A higher address allowance lets a
// campus network serve multiple legitimate users.
// ipKeyGenerator folds an IPv6 address down to its /56 block. Without that, a
// single IPv6 allocation hands out more addresses than anyone could ever
// exhaust, and counting per address would stop nothing.
const { normalizeEmail } = require('../utils/emailAddress');

const message = (text) => ({ message: text, code: 'RATE_LIMITED' });

const base = {
  standardHeaders: true,
  legacyHeaders: false
};

function accountAndAddressLimit({ limit, ipLimit, ...options }) {
  const byAddress = rateLimit({ ...base, ...options, limit: ipLimit,
    keyGenerator: req => ipKeyGenerator(req.ip) });
  const byAccount = rateLimit({ ...base, ...options, limit,
    keyGenerator: req => normalizeEmail(req.body?.email) || 'missing-email' });
  return (req, res, next) => byAddress(req, res, error => error ? next(error) : byAccount(req, res, next));
}

// Sign-in. Only failures count, so ordinary use, and signing in on several
// devices, never runs into it.
const loginLimiter = accountAndAddressLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  ipLimit: 200,
  skipSuccessfulRequests: true,
  message: message('Too many sign-in attempts. Please wait a few minutes and try again.')
});

// Checking a one-time code. Every attempt counts: that is the guessing we are
// trying to stop.
const codeCheckLimiter = accountAndAddressLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  ipLimit: 120,
  message: message('Too many attempts. Please request a new code and try again.')
});

// Asking for a code to be sent. This one costs money and fills an inbox.
const codeSendLimiter = accountAndAddressLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  ipLimit: 100,
  message: message('Too many codes requested. Please wait before asking for another.')
});

// Creating accounts, by address only: there is no account yet to key on.
// Deliberately loose. A whole computer lab, or a campus behind one NAT, can
// share a single address, and a sign-up session with a class of students must
// not look like an attack. This only has to stop bulk automated registration.
const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 40,
  message: message('Too many accounts created from here. Please try again later.')
});

module.exports = { loginLimiter, codeCheckLimiter, codeSendLimiter, registerLimiter };
