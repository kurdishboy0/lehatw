// A date chosen in the job form closes at midnight after that date in Iraq.
// Store the exclusive cutoff in UTC; Iraq uses UTC+03:00 throughout the year.
function parseApplicationDeadline(value, now = new Date()) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('INVALID_APPLICATION_DEADLINE');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error('INVALID_APPLICATION_DEADLINE');
  }
  const cutoff = new Date(date.getTime() + 21 * 60 * 60 * 1000);
  if (cutoff <= now) throw new Error('APPLICATION_DEADLINE_PAST');
  return cutoff;
}

function openJobWhere(now = new Date()) {
  return { isActive: true, removedByAdmin: false, OR: [
    { applicationDeadline: null }, { applicationDeadline: { gt: now } }
  ] };
}

function isJobOpen(job, now = new Date()) {
  return Boolean(job?.isActive && !job.removedByAdmin &&
    (!job.applicationDeadline || new Date(job.applicationDeadline) > now));
}

function deadlineError(res, error) {
  if (!['INVALID_APPLICATION_DEADLINE', 'APPLICATION_DEADLINE_PAST'].includes(error.message)) return false;
  res.status(400).json({ code: error.message, message: 'Choose a valid application deadline that has not passed.' });
  return true;
}

module.exports = { parseApplicationDeadline, openJobWhere, isJobOpen, deadlineError };
