function normalizeContactPhone(value) {
  if (typeof value !== 'string') return null;
  const phone = value.trim().replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x660))
    .replace(/[\u06f0-\u06f9]/g, d => String(d.charCodeAt(0) - 0x6f0)).replace(/[\s()-]/g, '');
  return /^\+?\d{7,15}$/.test(phone) ? phone : null;
}
module.exports = { normalizeContactPhone };
