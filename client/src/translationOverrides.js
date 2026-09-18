import axios from 'axios';
import i18n, { defaultResources } from './i18n';

// Applies one admin text edit to the live translations. `value` null means
// the edit was reset, so the built-in text comes back.
export function applyTextOverride(lang, key, value) {
  const original = key.split('.').reduce((node, part) => node?.[part], defaultResources[lang]?.translation);
  const text = value ?? original;
  if (typeof text === 'string') i18n.addResource(lang, 'translation', key, text);
}

// Loads admin edits to the site's text and layers them over the built-in
// text. The site works without them, so failures are ignored.
export async function loadTextOverrides() {
  try {
    const res = await axios.get('/api/translations');
    for (const [lang, entries] of Object.entries(res.data || {})) {
      for (const [key, value] of Object.entries(entries)) applyTextOverride(lang, key, value);
    }
  } catch {
    // Keep the built-in text.
  }
}
