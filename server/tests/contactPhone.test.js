const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeContactPhone } = require('../utils/contactPhone');
test('Arabic and Kurdish digits normalize to a recruiter-readable contact number', () => {
  assert.equal(normalizeContactPhone('(٠٧٥٠) (٨٩٦٨٤٦٩)'), '07508968469');
  assert.equal(normalizeContactPhone('+964 750 896 8469'), '+9647508968469');
  assert.equal(normalizeContactPhone('٠٧٥٠٤٤٧٩٠٧٢'), '07504479072');
});
test('invalid contacts cannot be stored as phone numbers', () => {
  for (const value of ['', '123', '123abc4567', '+1234567890123456', null, {}]) assert.equal(normalizeContactPhone(value), null);
});
