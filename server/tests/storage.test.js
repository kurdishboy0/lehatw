const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
// Use the real storage utility, with only the Supabase SDK replaced. This
// file never loads .env or creates a real Supabase client.
const sdkId = require.resolve('@supabase/supabase-js');
const originalSdk = require.cache[sdkId];
const originalEnv = { ...process.env };
let calls, buckets, failure, storage;
const client = { storage: {
  listBuckets: async () => ({ data: buckets, error: null }),
  createBucket: async (bucket, options) => { calls.push({ operation: 'createBucket', bucket, options }); return { error: null }; },
  from: bucket => ({
    upload: async (key, buffer, options) => { calls.push({ operation: 'upload', bucket, key, options }); return { error: failure }; },
    getPublicUrl: key => ({ data: { publicUrl: `https://storage.example.test/storage/v1/object/public/${bucket}/${key}` } }),
    createSignedUrl: async (key, ttl) => { calls.push({ operation: 'sign', bucket, key, ttl }); return { data: { signedUrl: 'https://storage.example.test/signed?token=test' }, error: failure }; },
    remove: async keys => { calls.push({ operation: 'delete', bucket, keys }); return { error: null }; }
  })
} };
require.cache[sdkId] = { id: sdkId, filename: sdkId, loaded: true, exports: { createClient: () => client } };
beforeEach(() => {
  calls = []; buckets = []; failure = null;
  Object.assign(process.env, { SUPABASE_URL: 'https://storage.example.test', SUPABASE_SERVICE_ROLE_KEY: 'test-only-storage-key' });
  delete require.cache[require.resolve('../utils/supabaseStorage')]; storage = require('../utils/supabaseStorage');
});
after(() => {
  if (originalSdk) require.cache[sdkId] = originalSdk; else delete require.cache[sdkId];
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});
test('new CV bucket is private and uploads return only the storage key', async () => {
  const value = await storage.uploadPrivate(Buffer.from('test CV'), 'resumes/test.pdf', 'application/pdf');
  assert.equal(value, 'resumes/test.pdf');
  assert.deepEqual(calls[0], { operation: 'createBucket', bucket: 'private-uploads', options: { public: false } });
  assert.equal(calls[1].bucket, 'private-uploads');
});
test('photo bucket remains public and returns its public image URL', async () => {
  const value = await storage.uploadToStorage(Buffer.from('test photo'), 'student-photos/test.jpg', 'image/jpeg');
  assert.equal(calls[0].options.public, true); assert.match(value, /object\/public\/uploads\/student-photos/);
});
test('existing bucket is reused rather than recreated', async () => {
  buckets = [{ name: 'private-uploads', public: false }];
  await storage.uploadPrivate(Buffer.from('test CV'), 'resumes/test.pdf', 'application/pdf');
  assert.equal(calls.some(c => c.operation === 'createBucket'), false);
});
test('CV signing uses private bucket and a 15-minute TTL', async () => {
  await storage.signedUrlFor('resumes/test.pdf');
  assert.deepEqual(calls[0], { operation: 'sign', bucket: 'private-uploads', key: 'resumes/test.pdf', ttl: 900 });
});
test('upload/signing provider errors propagate rather than reporting false success', async () => {
  failure = new Error('Simulated provider failure');
  await assert.rejects(() => storage.uploadPrivate(Buffer.from('test CV'), 'resumes/test.pdf', 'application/pdf'), /Simulated provider failure/);
  await assert.rejects(() => storage.signedUrlFor('resumes/test.pdf'), /Simulated provider failure/);
});
test('unconfigured storage fails before SDK upload', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  await assert.rejects(() => storage.uploadPrivate(Buffer.from('test CV'), 'resumes/test.pdf', 'application/pdf'), /STORAGE_NOT_CONFIGURED/);
  assert.equal(calls.length, 0);
});
test('private keys, legacy public URLs and old local paths are distinguished', () => {
  assert.ok(storage.isStoredPath('resumes/test.pdf'));
  assert.equal(storage.isStoredPath('https://example.test/cv.pdf'), false);
  assert.equal(storage.isStoredPath('/uploads/old.pdf'), false); assert.ok(storage.isLocalDiskPath('/uploads/old.pdf'));
  assert.equal(storage.pathFromPublicUrl('https://storage.example.test/storage/v1/object/public/uploads/resumes/old.pdf'), 'resumes/old.pdf');
});
test('file cleanup chooses the correct bucket and ignores unrelated URLs', async () => {
  await storage.deleteStoredFile('resumes/test.pdf');
  await storage.deleteStoredFile('https://storage.example.test/storage/v1/object/public/uploads/student-photos/test.jpg');
  await storage.deleteStoredFile('https://external.example.test/photo.jpg');
  assert.deepEqual(calls.map(c => c.bucket), ['private-uploads', 'uploads']);
});
