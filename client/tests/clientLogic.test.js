import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import axios from 'axios';
import { validEmail } from '../src/emailAddress.js';
import { deadlineDate, applicationsClosed } from '../src/jobDeadline.js';
import { isRtlLanguage } from '../src/rtl.js';
import { toLocalizedDigits, formatDateTime } from '../src/localizeDigits.js';
import { setSession, getToken, getUser, authHeader, logout } from '../src/auth.js';
import { installApiResponseGuard } from '../src/apiResponseGuard.js';

for (const email of ['person@example.com', ' PERSON@EXAMPLE.COM ', 'talent+test@example.com']) {
  test(`email validation accepts ${email}`, () => assert.ok(validEmail(email)));
}
for (const email of ['', 'invalid', 'name@', '@example.com', 'a b@example.com', '<script>@example.com']) {
  test(`email validation rejects ${JSON.stringify(email)}`, () => assert.equal(validEmail(email), false));
}
for (const lang of ['en', 'ar', 'ckb']) test(`${lang} direction and digit conversion are consistent`, () => {
  assert.equal(isRtlLanguage(lang), lang !== 'en');
  assert.equal(toLocalizedDigits('0750 1234567', lang), lang === 'en' ? '0750 1234567' : '٠٧٥٠ ١٢٣٤٥٦٧');
});
test('localized invalid dates do not render broken date text', () => {
  assert.equal(formatDateTime('invalid', 'ckb'), '');
});
test('Kurdish and Arabic dates use isolated localized numeric text', () => {
  for (const lang of ['ar', 'ckb']) {
    const result = formatDateTime('2026-10-23T12:00:00Z', lang);
    assert.ok(result.startsWith('\u2066') && result.endsWith('\u2069'));
    assert.match(result, /٢٠٢٦/); assert.doesNotMatch(result, /Oct/);
  }
});
test('client recovers the inclusive Iraq date from the server exclusive cutoff', () => {
  assert.equal(deadlineDate('2026-10-23T21:00:00.000Z'), '2026-10-23'); assert.equal(deadlineDate(null), '');
});
test('client considers jobs closed exactly at their deadline and respects moderation', () => {
  const job = { isActive: true, applicationDeadline: '2026-10-23T21:00:00.000Z' };
  assert.equal(applicationsClosed(job, new Date('2026-10-23T20:59:59.999Z')), false);
  assert.equal(applicationsClosed(job, new Date('2026-10-23T21:00:00.000Z')), true);
  assert.equal(applicationsClosed({ isActive: true, removedByAdmin: true }), true);
  assert.equal(applicationsClosed({ isActive: false }), true);
});
test('session helpers safely handle corrupted local data and clear both session records', () => {
  const previous = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { setItem: (k, v) => values.set(k, v), getItem: k => values.get(k) ?? null, removeItem: k => values.delete(k) };
  try {
    assert.deepEqual(authHeader(), {}); setSession('test-only-token', { id: 1, role: 'STUDENT' });
    assert.equal(getToken(), 'test-only-token'); assert.equal(getUser().role, 'STUDENT');
    assert.deepEqual(authHeader(), { Authorization: 'Bearer test-only-token' });
    values.set('user', 'broken JSON'); assert.equal(getUser(), null);
    logout(); assert.equal(getToken(), null); assert.equal(getUser(), null);
  } finally {
    if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous;
  }
});
const guardId = installApiResponseGuard();
after(() => axios.interceptors.response.eject(guardId));
test('API response guard rejects the static-host HTML fallback that caused blank pages', async () => {
  await assert.rejects(() => axios.get('/api/jobs', { adapter: async config => ({ data: '<html>SPA</html>', status: 200, headers: { 'content-type': 'text/html' }, config }) }),
    error => error.code === 'ERR_INVALID_API_RESPONSE');
});
test('API guard preserves valid JSON and allows non-API text responses', async () => {
  const json = await axios.get('/api/jobs', { adapter: async config => ({ data: [], status: 200, headers: { 'content-type': 'application/json' }, config }) });
  assert.deepEqual(json.data, []);
  const text = await axios.get('/readme.txt', { adapter: async config => ({ data: 'Plain text', status: 200, headers: { 'content-type': 'text/plain' }, config }) });
  assert.equal(text.data, 'Plain text');
});

let vite, resources, usedKeys;
before(async () => {
  const { createServer } = await import('vite');
  vite = await createServer({ configFile: false, envFile: false, root: process.cwd(), server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
  resources = (await vite.ssrLoadModule('/src/i18n.js')).defaultResources;
  const paths = await readdir(resolve('src'), { recursive: true });
  usedKeys = new Set();
  for (const file of paths.filter(p => /\.[jt]sx?$/.test(p))) {
    const source = await readFile(resolve('src', file), 'utf8');
    for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) usedKeys.add(match[1]);
  }
});
after(async () => { if (vite) await vite.close(); });
const lookup = (lang, key) => key.split('.').reduce((value, part) => value?.[part], resources[lang]?.translation);
for (const lang of ['en', 'ar', 'ckb']) test(`all literal UI translation keys exist in ${lang}`, () => {
  const missing = [...usedKeys].filter(key => lookup(lang, key) === undefined);
  assert.deepEqual(missing, [], `Missing ${lang} keys: ${missing.join(', ')}`);
});
test('localized UI strings retain the same interpolation placeholders', () => {
  const tokens = value => typeof value === 'string' ? [...value.matchAll(/{{\s*([^}\s]+)\s*}}/g)].map(m => m[1]).sort() : [];
  const mismatches = [];
  for (const key of usedKeys) for (const lang of ['ar', 'ckb']) {
    if (lookup(lang, key) === undefined) continue;
    if (JSON.stringify(tokens(lookup('en', key))) !== JSON.stringify(tokens(lookup(lang, key)))) mismatches.push(`${lang}:${key}`);
  }
  assert.deepEqual(mismatches, [], `Interpolation mismatch: ${mismatches.join(', ')}`);
});
