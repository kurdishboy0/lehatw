import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { LINKEDIN_STATE_KEY, linkedinAuthorizationUrl, startLinkedInSignIn } from '../src/linkedinAuth.js';

test('LinkedIn authorization includes the state, correct callback and existing scopes', () => {
  for (const origin of ['http://localhost:5173', 'https://lehato.netlify.app']) {
    const url = new URL(linkedinAuthorizationUrl('test-public-client', origin, 'test-state'));
    assert.equal(url.origin, 'https://www.linkedin.com');
    assert.equal(url.searchParams.get('redirect_uri'), `${origin}/login`);
    assert.equal(url.searchParams.get('state'), 'test-state');
    assert.equal(url.searchParams.get('scope'), 'openid profile email');
  }
});
test('shared login/signup starter stores the same state that is sent to LinkedIn', () => {
  const previousWindow = globalThis.window, previousStorage = globalThis.sessionStorage;
  const values = new Map(); let destination;
  globalThis.window = { location: { origin: 'https://lehato.netlify.app', assign: value => { destination = value; } } };
  globalThis.sessionStorage = { setItem: (key, value) => values.set(key, value) };
  try {
    startLinkedInSignIn('test-public-client');
    const state = values.get(LINKEDIN_STATE_KEY);
    assert.ok(state); assert.equal(new URL(destination).searchParams.get('state'), state);
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousStorage;
  }
});

let vite, Login, Register, AuthContext, i18n, googleId;
before(async () => {
  const config = await readFile(new URL('../../netlify.toml', import.meta.url), 'utf8');
  const linkedinId = config.match(/VITE_LINKEDIN_CLIENT_ID\s*=\s*"([^"]+)"/)?.[1];
  googleId = config.match(/VITE_GOOGLE_CLIENT_ID\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(linkedinId, 'Netlify must supply the public client ID so the LinkedIn buttons render');
  assert.ok(googleId);
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  vite = await createServer({ configFile: false, envFile: false, root: process.cwd(), plugins: [react()],
    define: { 'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleId), 'import.meta.env.VITE_LINKEDIN_CLIENT_ID': JSON.stringify(linkedinId) },
    server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
  Login = (await vite.ssrLoadModule('/src/pages/Login.jsx')).default;
  Register = (await vite.ssrLoadModule('/src/pages/Register.jsx')).default;
  AuthContext = (await vite.ssrLoadModule('/src/authContextObject.js')).AuthContext;
  i18n = (await vite.ssrLoadModule('/src/i18n.js')).default;
});
after(async () => { if (vite) await vite.close(); });
for (const lang of ['en', 'ar', 'ckb']) {
  for (const page of ['login', 'register']) test(`${page} renders LinkedIn below Google in ${lang} with Netlify build configuration`, async () => {
    await i18n.changeLanguage(lang);
    const component = page === 'login' ? Login : Register;
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null,
      React.createElement(GoogleOAuthProvider, { clientId: googleId },
        React.createElement(I18nextProvider, { i18n },
          React.createElement(AuthContext.Provider, { value: { login: () => {} } }, React.createElement(component))))));
    const google = i18n.t(`${page}.google`), linkedin = i18n.t(`${page}.linkedin`);
    assert.ok(html.includes(google), 'Google button must stay visible');
    assert.ok(html.includes(linkedin), 'LinkedIn button must be visible');
    assert.ok(html.indexOf(linkedin) > html.indexOf(google), 'LinkedIn must appear below Google');
  });
}
