// Shared skill-similarity engine used by: the HR job-matching page, the student
// peer "Skill Match" page, and the HR talent search/filter page.
//
// Each student's skill set is represented as a weighted vector: every standard skill
// contributes a weight based on proficiency, and every custom skill (matched by
// trimmed, case-insensitive name) contributes a fixed weight. Similarity between two
// vectors is the weighted Jaccard index (a.k.a. Ruzicka similarity):
//   similarity = sum(min(a_i, b_i)) / sum(max(a_i, b_i))
// This rewards students who share more (and more proficient) skills, while still
// counting partial overlap fairly — unlike plain unweighted overlap counting.

const PROFICIENCY_WEIGHT = { Beginner: 1, Intermediate: 2, Expert: 3 };
const CUSTOM_SKILL_WEIGHT = 2; // treated like an "Intermediate" signal

function customSkillKey(name) {
  return `custom:${name.trim().toLowerCase()}`;
}

// Builds a weighted skill vector from a StudentProfile loaded with { skills: { skill }, customSkills }.
function buildSkillVector(studentProfile) {
  const vector = {};
  for (const s of studentProfile.skills || []) {
    vector[`skill:${s.skillId}`] = PROFICIENCY_WEIGHT[s.proficiency] || 1;
  }
  for (const cs of studentProfile.customSkills || []) {
    const key = customSkillKey(cs.name);
    vector[key] = Math.max(vector[key] || 0, CUSTOM_SKILL_WEIGHT);
  }
  return vector;
}

// Weighted Jaccard / Ruzicka similarity between two skill vectors. Returns 0..1.
function weightedJaccard(vectorA, vectorB) {
  const keys = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);
  let minSum = 0;
  let maxSum = 0;
  for (const key of keys) {
    const a = vectorA[key] || 0;
    const b = vectorB[key] || 0;
    minSum += Math.min(a, b);
    maxSum += Math.max(a, b);
  }
  return maxSum === 0 ? 0 : minSum / maxSum;
}

// Coverage score against an ad-hoc required-skill list (e.g. a job's required skills,
// or skills an HR user picked in the search filter). Unlike weightedJaccard, this only
// rewards matching the *required* skills — a student with many unrelated extra skills
// isn't penalized, but partial proficiency on a required skill still counts.
function requiredSkillsCoverage(studentVector, requiredSkillIds) {
  if (!requiredSkillIds || requiredSkillIds.length === 0) return 0;
  const maxWeight = PROFICIENCY_WEIGHT.Expert;
  let earned = 0;
  const total = requiredSkillIds.length * maxWeight;
  for (const skillId of requiredSkillIds) {
    earned += studentVector[`skill:${skillId}`] || 0;
  }
  return Math.round((earned / total) * 100);
}

function sharedSkillIds(vectorA, vectorB) {
  const shared = [];
  for (const key of Object.keys(vectorA)) {
    if (key.startsWith('skill:') && vectorB[key]) {
      shared.push(Number(key.split(':')[1]));
    }
  }
  return shared;
}

function sharedCustomSkillNames(studentA, studentB) {
  const namesB = new Set((studentB.customSkills || []).map(cs => cs.name.trim().toLowerCase()));
  return (studentA.customSkills || [])
    .map(cs => cs.name.trim())
    .filter(name => namesB.has(name.toLowerCase()));
}

module.exports = {
  buildSkillVector,
  weightedJaccard,
  requiredSkillsCoverage,
  sharedSkillIds,
  sharedCustomSkillNames
};
