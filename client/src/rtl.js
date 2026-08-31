const RTL_LANGUAGES = ['ar', 'ckb'];

export function isRtlLanguage(lang) {
  return RTL_LANGUAGES.includes(lang);
}
