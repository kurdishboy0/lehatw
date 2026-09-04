// Persistent file storage via Supabase Storage, so uploaded photos/resumes
// survive restarts and redeploys on hosts with no persistent disk (e.g. a
// free Render web service). Only active once SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set; the service role key is required (not
// the anon key) since uploads must bypass row-level security from the server.
const BUCKET = 'uploads';
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`;

let cachedClient = null;
let bucketEnsured = false;

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

async function ensureBucketExists(client) {
  if (bucketEnsured) return;
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) throw listError;

  if (!buckets.some((b) => b.name === BUCKET)) {
    const { error: createError } = await client.storage.createBucket(BUCKET, { public: true });
    if (createError) throw createError;
  }
  bucketEnsured = true;
}

// Uploads a buffer to `storagePath` (e.g. "student-photos/user7-12345.jpg")
// and returns its public URL.
async function uploadToStorage(buffer, storagePath, contentType) {
  const client = getClient();
  await ensureBucketExists(client);

  const { error } = await client.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true
  });
  if (error) throw error;

  const { data } = client.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

// Best-effort delete, given a public URL previously returned by uploadToStorage.
// Silently no-ops for anything that isn't a Supabase Storage URL (e.g. a
// legacy local-disk path from before this migration).
async function deleteFromStorageUrl(url) {
  if (!url || !url.includes(PUBLIC_URL_MARKER)) return;
  try {
    const client = getClient();
    const storagePath = url.split(PUBLIC_URL_MARKER)[1];
    if (storagePath) await client.storage.from(BUCKET).remove([storagePath]);
  } catch (error) {
    console.error('deleteFromStorageUrl failed:', error);
  }
}

module.exports = { uploadToStorage, deleteFromStorageUrl };
