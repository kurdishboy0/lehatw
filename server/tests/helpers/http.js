const express = require('express');
const jwt = require('jsonwebtoken');

async function startApi(mounts, configure) {
  const app = express();
  app.use(express.json());
  if (configure) configure(app);
  for (const [prefix, router] of mounts) app.use(prefix, router);
  app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
    res.status(500).json({ message: error.message });
  });
  const server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    async call(method, route, { user, body, form, headers = {} } = {}) {
      const token = user && jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const response = await fetch(base + route, { method,
        headers: { ...(body && !form ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
        body: form || (body ? JSON.stringify(body) : undefined) });
      const contentType = response.headers.get('content-type') || '';
      return { status: response.status, headers: response.headers, body: contentType.includes('json') ? await response.json() : await response.text() };
    },
    async close() { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
  };
}
module.exports = { startApi };
