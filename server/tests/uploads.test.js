const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/harness');
const { startApi } = require('./helpers/http');
const { handlePhotoUpload, handleResumeUpload, handleOptionalCvUpload } = require('../middleware/upload');
let api;
before(async () => { api = await startApi([], app => {
  const result = (req, res) => res.json({ hasFile: Boolean(req.file), mime: req.file?.mimetype, bytes: req.file?.buffer.length });
  app.post('/photo', handlePhotoUpload, result);
  app.post('/resume', handleResumeUpload, result);
  app.post('/application', handleOptionalCvUpload, result);
}); });
after(async () => { if (api) await api.close(); });
function form(field, mime, filename, size = 16) {
  const data = new FormData(); data.append(field, new Blob([Buffer.alloc(size)], { type: mime }), filename); return data;
}
for (const [mime, name] of [['image/jpeg', 'photo.jpg'], ['image/png', 'photo.png'], ['image/webp', 'photo.webp']]) {
  test(`photo upload allows ${mime}`, async () => {
    const res = await api.call('POST', '/photo', { form: form('photo', mime, name) });
    assert.equal(res.status, 200); assert.equal(res.body.mime, mime); assert.equal(res.body.bytes, 16);
  });
}
for (const [mime, name] of [['application/pdf', 'cv.pdf'], ['application/msword', 'cv.doc'], ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'cv.docx']]) {
  test(`resume upload allows ${mime}`, async () => {
    const res = await api.call('POST', '/resume', { form: form('resume', mime, name) });
    assert.equal(res.status, 200); assert.equal(res.body.mime, mime);
  });
}
test('photo and resume reject disallowed declared content types with JSON errors', async () => {
  for (const [route, field] of [['/photo', 'photo'], ['/resume', 'resume']]) {
    const res = await api.call('POST', route, { form: form(field, 'text/html', 'script.html') });
    assert.equal(res.status, 400); assert.equal(typeof res.body.message, 'string');
  }
});
test('required profile uploads reject missing files; applications permit missing CV files', async () => {
  for (const route of ['/photo', '/resume']) assert.equal((await api.call('POST', route, { body: {} })).status, 400);
  const res = await api.call('POST', '/application', { body: {} });
  assert.equal(res.status, 200); assert.equal(res.body.hasFile, false);
});
test('oversized photos and resumes fail at their respective 5 MB and 10 MB limits', async () => {
  for (const [route, field, mime, name, megabytes] of [
    ['/photo', 'photo', 'image/png', 'photo.png', 5], ['/resume', 'resume', 'application/pdf', 'cv.pdf', 10]
  ]) {
    const res = await api.call('POST', route, { form: form(field, mime, name, megabytes * 1024 * 1024 + 1) });
    assert.equal(res.status, 400); assert.match(res.body.message, /too large/i);
  }
});
test('unexpected multipart field names fail rather than silently accepting another file', async () => {
  assert.equal((await api.call('POST', '/photo', { form: form('wrong-field', 'image/png', 'photo.png') })).status, 400);
});
