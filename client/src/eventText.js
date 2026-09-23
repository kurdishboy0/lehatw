// Event title and description in the viewer's language, falling back to the
// English text an admin always fills in.
export function eventText(event, field, lang) {
  const primary = (lang || 'en').split('-')[0];
  return event[`${field}_${primary}`] || event[`${field}_en`];
}

export const EVENT_TYPE_TONE = {
  ACADEMIC: ['#e8eef9', '#1B2A4A'],
  COMPANY: ['#fdf6e3', '#8a6d1d'],
  CAREER_FAIR: ['#e6f4ea', '#276749'],
  WORKSHOP: ['#fde8e8', '#9b2c2c'],
  OTHER: ['#edf2f7', '#4a5568']
};
