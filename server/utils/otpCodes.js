const crypto = require('crypto');

// Six-digit one-time codes, for password resets and for verifying an account.
//
// Two things matter here. The code comes from the cryptographic generator, not
// Math.random(), which is a predictable PRNG: with a handful of observed codes
// its internal state can be recovered and the next one worked out. And only a
// hash of the code is stored, so a leaked database row (or a backup, or a log)
// can't be replayed against the account the way a plaintext code could.
const OTP_TTL_MS = 15 * 60 * 1000;

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

function otpExpiry() {
  return new Date(Date.now() + OTP_TTL_MS);
}

// Compares in constant time, so the answer can't be found by measuring how
// long a wrong guess takes.
function otpMatches(submitted, storedHash) {
  if (typeof submitted !== 'string' || !submitted || typeof storedHash !== 'string' || !storedHash) return false;
  const a = Buffer.from(hashOtp(submitted), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  // A code stored before this change is six plain digits, not a hash, so the
  // lengths differ and it simply fails: the holder asks for a new code.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function notExpired(expiresAt) {
  return Boolean(expiresAt) && new Date(expiresAt) > new Date();
}

module.exports = { generateOtp, hashOtp, otpExpiry, otpMatches, notExpired, OTP_TTL_MS };
