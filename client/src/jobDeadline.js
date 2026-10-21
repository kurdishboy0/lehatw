export function deadlineDate(value) {
  // Stored cutoff is exclusive midnight in Iraq; subtract a millisecond to
  // recover the inclusive calendar date shown in the form.
  return value ? new Date(new Date(value).getTime() - 1 + 3 * 3600000).toISOString().slice(0, 10) : '';
}

export function iraqToday() {
  return new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
}

export function applicationsClosed(job, now = new Date()) {
  return !job.isActive || Boolean(job.removedByAdmin) || Boolean(job.applicationDeadline && new Date(job.applicationDeadline) <= now);
}
