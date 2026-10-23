const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const { searchStudents } = require('../controllers/matchController');
beforeEach(h.reset);
test('study-field filtering includes translated education names as well as catalog skills', async () => {
  const names = { name_en: 'Computer Science', name_ar: 'علوم الحاسوب', name_ckb: 'زانستی کۆمپیوتەر' };
  h.on('category.findUnique', names);
  h.on('studentProfile.count', 0); h.on('studentProfile.findMany', []);
  const res = await h.invoke(searchStudents, { query: { categoryId: '44', subjectAreaId: '1' } });
  assert.equal(res.statusCode, 200);
  const where = h.last('studentProfile.findMany').where;
  assert.equal(where.user.accountStatus, 'ACTIVE');
  assert.deepEqual(where.AND[0].OR, [{ skills: { some: { skill: { categoryId: 44 } } } }, ...Object.values(names).map(name => ({ fieldOfStudy: { contains: name, mode: 'insensitive' } }))]);
});
test('an unknown study-field category does not broaden the public search', async () => {
  h.on('category.findUnique', null); h.on('studentProfile.count', 0); h.on('studentProfile.findMany', []);
  const res = await h.invoke(searchStudents, { query: { categoryId: '999999' } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(h.last('studentProfile.findMany').where.AND[0].OR, [{ skills: { some: { skill: { categoryId: 999999 } } } }]);
});
