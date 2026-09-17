const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// Renders Western digits (0-9) as Arabic-Indic digits for Arabic and Kurdish
// Sorani locales, matching how numbers are conventionally written there.
export function toLocalizedDigits(text, lang) {
  const primary = (lang || '').split('-')[0];
  if (primary !== 'ar' && primary !== 'ckb') return text;
  return String(text).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[Number(d)]);
}

// Browsers have no Sorani date formatting and quietly fall back to English
// month names, so Arabic/Kurdish get a numeric YYYY/MM/DD date instead, with
// localized digits. The Unicode isolate marks keep it reading left-to-right
// when embedded in a right-to-left sentence.
export function formatDateTime(value, lang, { withTime = true } = {}) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const primary = (lang || '').split('-')[0];
  if (primary === 'ar' || primary === 'ckb') {
    const pad = (n) => String(n).padStart(2, '0');
    let s = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
    if (withTime) s += ` ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `⁦${toLocalizedDigits(s, lang)}⁩`;
  }
  return d.toLocaleString('en-GB', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}
