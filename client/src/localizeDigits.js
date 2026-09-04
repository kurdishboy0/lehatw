const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// Renders Western digits (0-9) as Arabic-Indic digits for Arabic and Kurdish
// Sorani locales, matching how numbers are conventionally written there.
export function toLocalizedDigits(text, lang) {
  const primary = (lang || '').split('-')[0];
  if (primary !== 'ar' && primary !== 'ckb') return text;
  return String(text).replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[Number(d)]);
}
