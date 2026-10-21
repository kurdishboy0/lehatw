function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(value) {
  return typeof value === 'string' && value.length <= 254 &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

module.exports = { normalizeEmail, isValidEmail };
