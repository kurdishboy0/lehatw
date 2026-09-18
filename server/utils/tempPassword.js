const crypto = require('crypto');

// Readable characters only (no 0/O, 1/l/I) so a password read out over the
// phone isn't mistyped. Always includes each class the signup form requires.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%*?';

function pick(set) {
  return set[crypto.randomInt(set.length)];
}

function generateTempPassword(length = 12) {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(all));
  // Fisher-Yates shuffle so the required classes aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = { generateTempPassword };
