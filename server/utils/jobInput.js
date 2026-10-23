function readJobInput(body, { partial = false } = {}) {
  const invalid = message => { throw Object.assign(new Error(message), { code: 'INVALID_JOB_INPUT' }); };
  let title;
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200) {
      invalid('Please enter a job title of 1 to 200 characters.');
    }
    title = body.title.trim();
  }
  let skillIds;
  if (body.skillIds !== undefined) {
    if (!Array.isArray(body.skillIds) || body.skillIds.some(id =>
      !['string', 'number'].includes(typeof id) || !String(id).trim() || !Number.isSafeInteger(Number(id)) || Number(id) < 1)) {
      invalid('Please choose valid skills from the catalog.');
    }
    skillIds = [...new Set(body.skillIds.map(Number))];
  }
  return { title, skillIds };
}

function jobInputError(res, error) {
  if (error.code !== 'INVALID_JOB_INPUT') return false;
  res.status(400).json({ code: error.code, message: error.message });
  return true;
}

module.exports = { readJobInput, jobInputError };
