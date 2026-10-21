const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseApplicationDeadline, openJobWhere, isJobOpen } = require('../utils/jobDeadline');
const now = new Date('2026-10-21T12:00:00Z');

test('a deadline includes the whole chosen day in Iraq', () => {
  const cutoff = parseApplicationDeadline('2026-10-21', now);
  assert.equal(cutoff.toISOString(), '2026-10-21T21:00:00.000Z');
  const job = { isActive: true, applicationDeadline: cutoff };
  assert.equal(isJobOpen(job, new Date('2026-10-21T20:59:59.999Z')), true);
  assert.equal(isJobOpen(job, cutoff), false);
});
test('invalid dates and timestamp inputs cannot bypass date validation', () => {
  for (const value of ['2026-02-30', '2026-13-01', '2026-10-21T23:00:00Z', 'garbage', {}, 1]) {
    assert.throws(() => parseApplicationDeadline(value, now), /INVALID_APPLICATION_DEADLINE/);
  }
});
test('reject past deadlines but permit today until its cutoff', () => {
  assert.throws(() => parseApplicationDeadline('2026-10-20', now), /APPLICATION_DEADLINE_PAST/);
  assert.throws(() => parseApplicationDeadline('2026-10-21', new Date('2026-10-21T21:00:00Z')), /APPLICATION_DEADLINE_PAST/);
  assert.ok(parseApplicationDeadline('2028-02-29', now));
});
test('optional dates preserve on omission and clear explicitly', () => {
  assert.equal(parseApplicationDeadline(undefined), undefined);
  assert.equal(parseApplicationDeadline(''), null);
  assert.equal(parseApplicationDeadline(null), null);
  assert.equal(isJobOpen({ isActive: true, applicationDeadline: null }, now), true);
});
test('inactive and removed jobs are never open', () => {
  assert.equal(isJobOpen(null, now), false);
  assert.equal(isJobOpen({ isActive: false }, now), false);
  assert.equal(isJobOpen({ isActive: true, removedByAdmin: true }, now), false);
});
test('browse query excludes expired jobs and carries a fresh cutoff', () => {
  assert.deepEqual(openJobWhere(now), {
    isActive: true, removedByAdmin: false,
    OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }]
  });
});
