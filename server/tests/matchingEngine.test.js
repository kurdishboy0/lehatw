const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchJob, byMatch } = require('../utils/jobMatch');
const { buildSkillVector, weightedJaccard, requiredSkillsCoverage, sharedSkillIds, sharedCustomSkillNames } = require('../utils/similarity');
const { validateSkillText, findExactSkillMatch, suggestSimilarSkills } = require('../utils/skillText');

const examples = [
  ['empty requirement list', [], [], 0, 0],
  ['no talent skills', [], [1, 2], 0, 0],
  ['full coverage', [{ skillId: 1 }, { skillId: 2 }], [1, 2], 2, 100],
  ['partial coverage rounds correctly', [{ skillId: 1 }], [1, 2, 3], 1, 33],
  ['unrelated extra skills never penalize coverage', [{ skillId: 1 }, { skillId: 99 }], [1], 1, 100],
  ['duplicate requirements count once', [{ skillId: 1 }], [1, 1, 2], 1, 50],
  ['duplicate talent skills count once', [{ skillId: 1 }, { skillId: 1 }], [1, 2], 1, 50]
];
for (const [name, skills, required, matched, percent] of examples) test(`job match: ${name}`, () => {
  const result = matchJob(skills, required);
  assert.equal(result.matched, matched); assert.equal(result.percent, percent);
  assert.equal(result.matched + result.missingSkillIds.length, result.total);
  assert.ok(result.percent >= 0 && result.percent <= 100);
});
test('proficiency changes the tie-breaker, never the headline coverage', () => {
  const beginner = matchJob([{ skillId: 1, proficiency: 'Beginner' }], [1]);
  const expert = matchJob([{ skillId: 1, proficiency: 'Expert' }], [1]);
  assert.equal(beginner.percent, expert.percent); assert.ok(expert.proficiency > beginner.proficiency);
  assert.deepEqual([{ id: 1, match: beginner }, { id: 2, match: expert }].sort(byMatch).map(x => x.id), [2, 1]);
});
test('higher coverage outranks higher proficiency', () => {
  const a = { match: matchJob([{ skillId: 1, proficiency: 'Expert' }], [1, 2, 3]) };
  const b = { match: matchJob([{ skillId: 1 }, { skillId: 2 }], [1, 2, 3]) };
  assert.equal([a, b].sort(byMatch)[0], b);
});
test('skill vectors keep catalog IDs separate from typed names and normalize case', () => {
  assert.deepEqual(buildSkillVector({ skills: [{ skillId: 3, proficiency: 'Expert' }], customSkills: [{ name: '  IoT ', isApproved: true }, { name: 'iot', isApproved: true }] }),
    { 'skill:3': 3, 'custom:iot': 2 });
});
for (const [name, a, b, expected] of [
  ['empty sets', {}, {}, 0], ['identical vectors', { x: 2 }, { x: 2 }, 1],
  ['disjoint vectors', { x: 1 }, { y: 1 }, 0], ['different proficiency', { x: 1 }, { x: 3 }, 1 / 3],
  ['partial overlap', { x: 2, y: 1 }, { x: 1, z: 1 }, 1 / 4]
]) test(`weighted Jaccard: ${name}`, () => {
  assert.equal(weightedJaccard(a, b), expected); assert.equal(weightedJaccard(b, a), expected);
});
test('Jaccard symmetry and range hold across 100 deterministic skill pairs', () => {
  for (let seed = 0; seed < 100; seed++) {
    const a = {}, b = {};
    for (let id = 0; id < 8; id++) { a[id] = (seed + id * 3) % 4; b[id] = (seed * 3 + id) % 4; }
    const value = weightedJaccard(a, b);
    assert.ok(value >= 0 && value <= 1); assert.equal(value, weightedJaccard(b, a));
  }
});
test('required-skill coverage uses proficiency and ignores unrelated skills', () => {
  assert.equal(requiredSkillsCoverage({ 'skill:1': 3, 'skill:2': 1, 'skill:99': 3 }, [1, 2]), 67);
  assert.equal(requiredSkillsCoverage({}, []), 0);
});
test('shared catalog IDs and custom names are compared independently', () => {
  assert.deepEqual(sharedSkillIds({ 'skill:1': 1, 'custom:iot': 2 }, { 'skill:1': 2, 'skill:3': 1 }), [1]);
  assert.deepEqual(sharedCustomSkillNames({ customSkills: [{ name: ' IoT ', isApproved: true }] }, { customSkills: [{ name: 'iot', isApproved: true }] }), ['IoT']);
});
for (const name of ['Python', 'C++', 'C#', 'Node.js', 'AI/ML', 'ژیری دەستکرد', 'تعلم الآلة']) {
  test(`custom skill accepts legitimate text: ${name}`, () => assert.equal(validateSkillText(name), null));
}
for (const name of ['', ' ', '<script>alert(1)</script>', '🚀']) {
  test(`custom skill rejects unsafe or empty input: ${JSON.stringify(name)}`, () => assert.ok(validateSkillText(name)));
}
test('catalog lookup folds whitespace and case; fuzzy suggestions catch near spellings', () => {
  const catalog = [{ id: 1, name_en: 'Python' }, { id: 2, name_en: 'Node.js' }];
  assert.equal(findExactSkillMatch(' PYTHON ', catalog).id, 1);
  assert.equal(suggestSimilarSkills('NodeJS', catalog)[0].id, 2);
  assert.equal(suggestSimilarSkills('Pyhton', catalog)[0].id, 1);
  assert.deepEqual(suggestSimilarSkills('Architecture', catalog), []);
});
