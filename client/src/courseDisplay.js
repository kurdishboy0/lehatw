// Shared bits for showing courses: option lists and price formatting.
export const COURSE_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'];
export const COURSE_LANGUAGES = ['ENGLISH', 'ARABIC', 'KURDISH', 'MIXED'];
export const COURSE_DELIVERIES = ['ONLINE', 'IN_PERSON', 'HYBRID'];
export const COURSE_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'];

export const STATUS_TONE = { DRAFT: 'gray', PENDING: 'yellow', APPROVED: 'green', REJECTED: 'red' };

// "Free", or the price with thousands separators in the viewer's digits.
export function coursePrice(course, t, localizeDigits, lang) {
  if (!course.priceIqd) return t('courses.free');
  return t('courses.price', { amount: localizeDigits(course.priceIqd.toLocaleString('en-US'), lang) });
}
