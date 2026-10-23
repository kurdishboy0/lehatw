// Process-local doubles only. Never loads .env, opens Prisma, sends mail or
// connects to storage. Each node:test file gets its own isolated process.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const handlers = new Map();
const calls = [];
const emails = [];
const notifications = [];
const audits = [];
const files = [];
const unexpected = [];
const state = { emailFailure: false, emailConfigured: true, storageFailure: null };
const models = new Map();
const db = new Proxy({}, {
  get(_, model) {
    if (model === '$transaction') return async work => {
      calls.push({ operation: '$transaction' });
      return typeof work === 'function' ? work(db) : Promise.all(work);
    };
    if (!models.has(model)) models.set(model, new Proxy({}, {
      get(_, method) {
        return async query => {
          const operation = `${model}.${method}`;
          calls.push({ operation, query });
          if (!handlers.has(operation)) {
            unexpected.push(operation);
            throw new Error(`Unexpected database call: ${operation}`);
          }
          return handlers.get(operation)(query);
        };
      }
    }));
    return models.get(model);
  }
});
function stub(relativePath, exports) {
  const id = require.resolve(path.join(root, relativePath));
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('db', db);
stub('utils/sendEmail', Object.assign(async (...args) => {
  if (state.emailFailure) throw new Error('Test delivery unavailable');
  emails.push(args);
}, { isConfigured: () => state.emailConfigured }));
stub('utils/notify', {
  notifyUser: (userId, payload) => notifications.push({ userId, ...payload }),
  notifyAdmins: payload => notifications.push({ admins: true, ...payload })
});
stub('utils/audit', { logAdminAction: async (req, action) => audits.push({ adminId: req.user.id, ...action }) });
stub('utils/displayName', { getDisplayName: async user => user.email.split('@')[0] });
stub('utils/supabaseStorage', {
  SIGNED_URL_TTL_SECONDS: 900,
  isStoredPath: value => typeof value === 'string' && value.startsWith('resumes/'),
  uploadPrivate: async (buffer, key, mime) => {
    if (state.storageFailure) throw new Error(state.storageFailure);
    files.push({ operation: 'uploadPrivate', key, mime, bytes: buffer.length });
    return key;
  },
  uploadToStorage: async (buffer, key) => {
    if (state.storageFailure) throw new Error(state.storageFailure);
    files.push({ operation: 'uploadPublic', key, bytes: buffer.length });
    return `https://storage.example.test/${key}`;
  },
  signedUrlFor: async key => {
    if (state.storageFailure) throw new Error(state.storageFailure);
    files.push({ operation: 'sign', key });
    return 'https://storage.example.test/private?token=test-only-signature';
  },
  deleteStoredFile: async key => { files.push({ operation: 'deletePrivate', key }); },
  deleteFromStorageUrl: async key => { files.push({ operation: 'deletePublic', key }); }
});
process.env.JWT_SECRET = 'isolated-test-secret-never-used-in-production';
process.env.CLIENT_URL = 'https://lehatw.example.test';
// A missed service double must fail, never contact a live provider.
const nativeFetch = global.fetch;
global.fetch = (url, options) => {
  if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(String(url))) throw new Error('External network forbidden in isolated tests');
  return nativeFetch(url, options);
};
function on(operation, value) { handlers.set(operation, typeof value === 'function' ? value : async () => value); }
function reset() {
  handlers.clear();
  for (const list of [calls, emails, notifications, audits, files, unexpected]) list.length = 0;
  Object.assign(state, { emailFailure: false, emailConfigured: true, storageFailure: null });
  const authModule = require.cache[require.resolve(path.join(root, 'middleware/authMiddleware'))];
  if (authModule) for (let id = 0; id < 1000; id++) authModule.exports.invalidateUserCache(id);
}
function request(overrides = {}) {
  return { body: {}, query: {}, params: {}, headers: {}, user: { id: 1, role: 'STUDENT', email: 'talent@example.test' },
    get: name => name === 'origin' ? 'https://lehatw.example.test' : undefined, ...overrides };
}
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; },
    set() { return this; }, setHeader() {}, end() { return this; } };
}
async function invoke(handler, overrides) {
  const res = response();
  await handler(request(overrides), res);
  assert.deepEqual(unexpected, [], 'Test fixture omitted database operations; this is not a product failure');
  return res;
}
function last(operation) { return calls.filter(c => c.operation === operation).at(-1)?.query; }
function error(code) { return Object.assign(new Error(`Simulated Prisma ${code}`), { code }); }
function user(overrides = {}) {
  return { id: 1, email: 'talent@example.test', role: 'STUDENT', accountStatus: 'ACTIVE', phoneVerified: true,
    isSuperAdmin: false, studentProfile: null, hrProfile: null, instructorProfile: null, ...overrides };
}
function skill(id, proficiency = 'Intermediate') {
  return { skillId: id, proficiency, skill: { id, name_en: `Skill ${id}`, name_ar: `مهارة ${id}`, name_ckb: `توانا ${id}` } };
}
function profile(overrides = {}) {
  return { id: 11, userId: 1, fullName: 'Test Talent', university: 'Test University', fieldOfStudy: 'Computer Science',
    graduationYear: 2027, showEmailToStudents: false, skills: [skill(1)], customSkills: [],
    user: user(), ...overrides };
}
function job(overrides = {}) {
  return { id: 21, title: 'Test Analyst', description: 'Analyse data', isActive: true, requiresCv: true,
    applicationDeadline: null, removedByAdmin: false, hrProfileId: 31, skills: [skill(1), skill(2)],
    hrProfile: { id: 31, userId: 2, status: 'APPROVED', companyName: 'Test Company', user: { email: 'hr@example.test' } }, ...overrides };
}
module.exports = { db, on, reset, request, response, invoke, last, error, user, profile, skill, job,
  state, calls, emails, notifications, audits, files, unexpected, stub };
