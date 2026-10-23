const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const PASSWORD_RULE_MESSAGE = 'Use a password of at least 8 characters and at most 72 bytes.';

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH &&
    Buffer.byteLength(password, 'utf8') <= MAX_PASSWORD_BYTES;
}

module.exports = { isValidPassword, PASSWORD_RULE_MESSAGE };
