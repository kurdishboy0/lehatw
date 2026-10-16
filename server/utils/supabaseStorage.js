// Persistent file storage via Supabase Storage, so uploaded photos/resumes
// survive restarts and redeploys on hosts with no persistent disk (e.g. a
// free Render web service). Only active once SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set; the service role key is required (not
// the anon key) since uploads must bypass row-level security from the server.
//
// Two buckets, because the two kinds of file need opposite rules:
//
//   uploads          public  - profile photos, shown on pages anyone can open
//   private-uploads  private - CVs, which carry a home address and a phone
//                              number and must never be fetchable by URL alone
//
// Nothing in the private bucket is reachable without a signature, so the only
// way to read a CV is through an endpoint that checks who is asking.
const BUCKET = 'uploads';
const PRIVATE_BUCKET = 'private-uploads';
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`;
const SIGNED_URL_TTL_SECONDS = 15 * 60;

let cachedClient = null;
const bucketsEnsured = new Set();

function getClient() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('STORAGE_NOT_CONFIGURED');
  }
  if (!cachedClient) {
    const { createClient } = require('@supabase/supabase-js');
    cachedClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return cachedClient;
}

async function ensureBucketExists(client, bucket, isPublic) {
  if (bucketsEnsured.has(bucket)) return;
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) throw listError;

  if (!buckets.some((b) => b.name === bucket)) {
    const { error: createError } = await client.storage.createBucket(bucket, { public: isPublic });
    if (createError) throw createError;
  }
  bucketsEnsured.add(bucket);
}

// Uploads a buffer to `storagePath` (e.g. "student-photos/user7-12345.jpg")
// and returns its public URL. For things anyone may look at.
async function uploadToStorage(buffer, storagePath, contentType) {
  const client = getClient();
  await ensureBucketExists(client, BUCKET, true);

  const { error } = await client.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true
  });
  if (error) throw error;

  const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

// Uploads to the private bucket and returns the storage path, not a URL:
// there is no URL that works on its own, which is the point. The path is what
// gets written to the database.
async function uploadPrivate(buffer, storagePath, contentType) {
  const client = getClient();
  await ensureBucketExists(client, PRIVATE_BUCKET, false);

  const { error } = await client.storage.from(PRIVATE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true
  });
  if (error) throw error;
  return storagePath;
}

// A link that works for a quarter of an hour and then stops. Callers must
// have decided the person asking is allowed to see the file.
async function signedUrlFor(storagePath, expiresInSeconds = SIGNED_URL_TTL_SECONDS) {
  if (!storagePath) return null;
  const client = getClient();
  const { data, error } = await client.storage.from(PRIVATE_BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

// Stored values come in three shapes. A bucket path like "resumes/x.pdf" is
// the current form. A full https URL is a file still in the public bucket,
// from before this change. A value starting with "/" is older still: a path
// on the server's own disk, from before any of this moved to Supabase. Only
// the first can be signed.
function isStoredPath(value) {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('http') && !value.startsWith('/');
}

function isLocalDiskPath(value) {
  return typeof value === 'string' && value.startsWith('/uploads/');
}

function pathFromPublicUrl(url) {
  if (typeof url !== 'string' || !url.includes(PUBLIC_URL_MARKER)) return null;
  return url.split(PUBLIC_URL_MARKER)[1] || null;
}

// Best-effort delete, given a public URL previously returned by uploadToStorage.
// Silently no-ops for anything that isn't a Supabase Storage URL (e.g. a
// legacy local-disk path from before this migration).
async function deleteFromStorageUrl(url) {
  if (!url || !url.includes(PUBLIC_URL_MARKER)) return;
  try {
    const client = getClient();
    const storagePath = pathFromPublicUrl(url);
    if (storagePath) await client.storage.from(BUCKET).remove([storagePath]);
  } catch (error) {
    console.error('deleteFromStorageUrl failed:', error);
  }
}

async function deletePrivate(storagePath) {
  if (!isStoredPath(storagePath)) return;
  try {
    const client = getClient();
    await client.storage.from(PRIVATE_BUCKET).remove([storagePath]);
  } catch (error) {
    console.error('deletePrivate failed:', error);
  }
}

// Deletes whichever kind of value it is given, so callers holding a mix of
// old URLs and new paths don't have to care which they have.
async function deleteStoredFile(value) {
  if (!value) return;
  if (isStoredPath(value)) return deletePrivate(value);
  return deleteFromStorageUrl(value);
}

module.exports = {
  uploadToStorage,
  uploadPrivate,
  signedUrlFor,
  deleteFromStorageUrl,
  deletePrivate,
  deleteStoredFile,
  isStoredPath,
  isLocalDiskPath,
  pathFromPublicUrl,
  BUCKET,
  PRIVATE_BUCKET,
  SIGNED_URL_TTL_SECONDS
};
