import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { getUserMenuItems } from '../src/userNavigation.js';

for (const role of ['STUDENT', 'HR', 'INSTRUCTOR', 'ADMIN']) test(`${role} account navigation only exposes its own dashboard tools`, () => {
  const items = getUserMenuItems({ role }, key => key);
  const root = { STUDENT: '/student-dashboard', HR: '/hr-dashboard', INSTRUCTOR: '/instructor-dashboard', ADMIN: '/admin-dashboard' }[role];
  assert.equal(items[0].to, root);
  assert.ok(items.some(item => item.to === '/messages'));
  assert.equal(items.some(item => item.to.startsWith('/admin-dashboard')), role === 'ADMIN');
  assert.equal(items.some(item => item.to === '/hr-dashboard/post-job'), role === 'HR');
  if (role === 'INSTRUCTOR') assert.ok(items.some(item => item.to === '/instructor-dashboard#instructor-courses'));
});
let vite, TalentCard, i18n;
before(async () => {
  const { createServer } = await import('vite');
  const { default: react } = await import('@vitejs/plugin-react');
  vite = await createServer({ configFile: false, envFile: false, root: process.cwd(), plugins: [react()], server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true } });
  TalentCard = (await vite.ssrLoadModule('/src/components/TalentCard.jsx')).default;
  i18n = (await vite.ssrLoadModule('/src/i18n.js')).default;
});
after(async () => { if (vite) await vite.close(); });
for (const lang of ['en', 'ar', 'ckb']) test(`shared talent card retains profile/skills and private-contact behavior in ${lang}`, async () => {
  await i18n.changeLanguage(lang);
  const student = { id: 123, userId: 456, fullName: 'Test Talent', university: 'Test University', fieldOfStudy: 'Computer Science', graduationYear: 2026,
    skills: [{ id: 1, skill: { id: 7, name_en: 'Python' } }], customSkills: ['Approved skill'], similarityScore: 80 };
  const render = value => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(I18nextProvider, { i18n }, React.createElement(TalentCard, { student: value, t: i18n.t.bind(i18n), scoreLabel: 'match', showMessage: true }))));
  const html = render(student);
  assert.ok(html.includes('/students/123') && html.includes('/messages/456'));
  assert.ok(html.includes('Python') && html.includes('Computer Science') && html.includes('2026'));
  for (const key of ['home.uni', 'home.major', 'home.class_of', 'skillMatch.view_profile']) assert.ok(html.includes(i18n.t(key)));
  assert.ok(!html.includes('mailto:'));
  assert.ok(render({ ...student, email: 'visible@example.invalid' }).includes('mailto:visible@example.invalid'));
  assert.ok(render({ ...student, skills: [{ id: 7, name_en: 'Python' }] }).includes('Python'));
});
