// Validation + normalization for free-text ("custom") skill entries.
//
// - Character validation: only letters (any language), digits, spaces, and a
//   small set of punctuation actually used in real skill/tool names (C#, C++,
//   Node.js, CI/CD, R&D). Blocks HTML/script-like input, control characters,
//   and symbol spam.
// - Case-insensitive matching: comparisons are done on a normalized (trimmed,
//   collapsed-whitespace, lowercased) form so "python", "Python", and "PYTHON"
//   are recognized as the same skill instead of becoming duplicates.

const MIN_LENGTH = 2;
const MAX_LENGTH = 50;

// \p{L} = any Unicode letter, \p{N} = any Unicode number. Allows a conservative
// set of punctuation seen in real skill names: - . & / + # ( ) and spaces.
const VALID_CHARS_REGEX = /^[\p{L}\p{N}\s\-.&/+#()]+$/u;

function normalize(name) {
  return (name || '').trim().replace(/\s+/g, ' ');
}

function normalizeForComparison(name) {
  return normalize(name).toLowerCase();
}

// Returns null if valid, or a human-readable reason if not.
function validateSkillText(rawName) {
  const name = normalize(rawName);
  if (name.length < MIN_LENGTH || name.length > MAX_LENGTH) {
    return `must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`;
  }
  if (!VALID_CHARS_REGEX.test(name)) {
    return 'contains characters that are not allowed';
  }
  return null;
}

// Finds an exact, case-insensitive match for `name` among `skills` (each with
// an `id` and `name_en`). Used to fold a custom entry into the real catalog
// when the student just typed a different case of an existing skill.
function findExactSkillMatch(name, skills) {
  const target = normalizeForComparison(name);
  return skills.find((s) => normalizeForComparison(s.name_en) === target) || null;
}

module.exports = { normalize, normalizeForComparison, validateSkillText, findExactSkillMatch };
