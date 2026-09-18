// How well a student fits a job: which of the job's required skills they
// have ("3 of 4"). Proficiency doesn't change the headline number, only the
// order among students (or jobs) with the same coverage.
const PROFICIENCY_WEIGHT = { Beginner: 1, Intermediate: 2, Expert: 3 };

// studentSkills: [{ skillId, proficiency }]; jobSkillIds: [skillId]
function matchJob(studentSkills, jobSkillIds) {
  const required = [...new Set(jobSkillIds)];
  const bySkill = new Map((studentSkills || []).map((s) => [s.skillId, PROFICIENCY_WEIGHT[s.proficiency] || 1]));
  const matchedSkillIds = required.filter((id) => bySkill.has(id));
  const missingSkillIds = required.filter((id) => !bySkill.has(id));
  const proficiency = matchedSkillIds.reduce((sum, id) => sum + bySkill.get(id), 0);
  return {
    matched: matchedSkillIds.length,
    total: required.length,
    percent: required.length ? Math.round((matchedSkillIds.length / required.length) * 100) : 0,
    matchedSkillIds,
    missingSkillIds,
    // Tie-breaker only: more proficient in the matched skills ranks higher.
    proficiency
  };
}

// Best matches first: coverage, then proficiency in the matched skills.
function byMatch(a, b) {
  return (b.match.percent - a.match.percent) || (b.match.proficiency - a.match.proficiency);
}

module.exports = { matchJob, byMatch };
