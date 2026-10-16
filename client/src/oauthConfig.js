// Client IDs are public build settings. Missing providers must never prevent
// the regular email/password forms from rendering.
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
export const LINKEDIN_CLIENT_ID = (import.meta.env.VITE_LINKEDIN_CLIENT_ID || '').trim();
