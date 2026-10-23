const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/harness');
const { startApi } = require('./helpers/http');
const adminRoutes = require('../routes/adminRoutes');
const studentRoutes = require('../routes/studentRoutes');
const jobRoutes = require('../routes/jobRoutes');
const authRoutes = require('../routes/authRoutes');
const applicationRoutes = require('../routes/applicationRoutes');
const messageRoutes = require('../routes/messageRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const eventRoutes = require('../routes/eventRoutes');
const courseRoutes = require('../routes/courseRoutes');
const instructorRoutes = require('../routes/instructorRoutes');
const hrRoutes = require('../routes/hrRoutes');
const skillRoutes = require('../routes/skillRoutes');
const matchRoutes = require('../routes/matchRoutes');
const reportRoutes = require('../routes/reportRoutes');
let api;
const actors = [h.user(), h.user({ id: 2, role: 'HR' }), h.user({ id: 4, role: 'INSTRUCTOR' })];
before(async () => { api = await startApi([
  ['/api/admin', adminRoutes], ['/api/student', studentRoutes], ['/api/jobs', jobRoutes], ['/api/auth', authRoutes],
  ['/api/applications', applicationRoutes], ['/api/messages', messageRoutes], ['/api/notifications', notificationRoutes],
  ['/api/events', eventRoutes], ['/api/courses', courseRoutes], ['/api/instructor', instructorRoutes],
  ['/api/hr', hrRoutes], ['/api/skills', skillRoutes], ['/api/match', matchRoutes], ['/api/reports', reportRoutes]
]); });
after(async () => { if (api) await api.close(); });
beforeEach(() => { h.reset(); h.on('user.findUnique', q => actors.find(u => u.id === q.where.id) || h.user({ id: q.where.id, role: 'ADMIN' })); });

// Exercise the actual Express router, not a separately maintained copy of
// the endpoint list. A newly added admin endpoint is included automatically.
for (const layer of adminRoutes.stack.filter(l => l.route)) {
  for (const method of Object.keys(layer.route.methods)) {
    const route = '/api/admin' + layer.route.path.replace(/:[A-Za-z]+/g, '8');
    test(`HTTP authorization: ${method.toUpperCase()} ${route}`, async () => {
      assert.equal((await api.call(method, route, { body: ['get', 'delete'].includes(method) ? undefined : {} })).status, 401);
      for (const actor of actors) {
        const response = await api.call(method, route, { user: actor, body: ['get', 'delete'].includes(method) ? undefined : {} });
        assert.equal(response.status, 403, `${actor.role} must not access ${method} ${route}`);
      }
      assert.deepEqual(h.unexpected, []);
    });
  }
}
for (const [prefix, router] of [
  ['/api/student', studentRoutes], ['/api/jobs', jobRoutes], ['/api/applications', applicationRoutes],
  ['/api/messages', messageRoutes], ['/api/notifications', notificationRoutes], ['/api/events', eventRoutes],
  ['/api/courses', courseRoutes], ['/api/instructor', instructorRoutes], ['/api/hr', hrRoutes],
  ['/api/skills', skillRoutes], ['/api/match', matchRoutes], ['/api/reports', reportRoutes]
]) {
  for (const layer of router.stack.filter(l => l.route && l.route.stack.some(s => s.handle.name === 'protect'))) {
    for (const method of Object.keys(layer.route.methods)) {
      const route = prefix + layer.route.path.replace(/:[A-Za-z]+/g, '8');
      test(`HTTP missing token rejected: ${method.toUpperCase()} ${route}`, async () => {
        assert.equal((await api.call(method, route, { body: ['get', 'delete'].includes(method) ? undefined : {} })).status, 401);
      });
    }
  }
}
test('ordinary admin cannot use the super-admin account-management routes', async () => {
  const admin = { id: 3, role: 'ADMIN' };
  for (const [method, route] of [['GET', '/api/admin/admins'], ['POST', '/api/admin/admins'], ['PUT', '/api/admin/admins/8/super'], ['DELETE', '/api/admin/admins/8']]) {
    assert.equal((await api.call(method, route, { user: admin, body: method === 'GET' ? undefined : {} })).status, 403);
  }
});
test('public directory, skills and jobs remain available to guests', async () => {
  h.on('studentProfile.count', 0); h.on('studentProfile.findMany', []); h.on('skill.findMany', []); h.on('jobPost.findMany', []);
  for (const route of ['/api/student/all', '/api/jobs', '/api/jobs/skills']) assert.equal((await api.call('GET', route)).status, 200);
});
test('invalid registration fields are rejected before a controller can write data', async () => {
  const res = await api.call('POST', '/api/auth/register', { body: { email: 'wrong', password: 'short' } });
  assert.equal(res.status, 400); assert.equal(h.last('user.create'), undefined);
});

test('company and instructor accounts cannot mutate talent profiles or skills', async () => {
  for (const actor of actors.filter(u => u.role !== 'STUDENT')) {
    for (const [method, route] of [['POST', '/api/student/profile'], ['PUT', '/api/student/profile'],
      ['POST', '/api/student/profile/photo'], ['POST', '/api/student/profile/resume'], ['DELETE', '/api/student/profile/resume'], ['POST', '/api/skills/save']]) {
      assert.equal((await api.call(method, route, { user: actor, body: {} })).status, 403);
    }
  }
  assert.deepEqual(h.unexpected, []);
});
test('talent and instructor accounts cannot create or edit a company profile', async () => {
  for (const actor of actors.filter(u => u.role !== 'HR')) for (const method of ['POST', 'PUT']) {
    assert.equal((await api.call(method, '/api/hr/profile', { user: actor, body: {} })).status, 403);
  }
  assert.deepEqual(h.unexpected, []);
});
