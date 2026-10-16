#!/usr/bin/env node
// Moves CVs uploaded before the private bucket existed.
//
// Until now every CV sat in the public `uploads` bucket, which means anyone
// holding the URL can download it, signed in or not. This copies each one
// into the private bucket at the same path, points the database row at the
// path instead of the URL, and then removes the public copy, which is the
// step that actually closes the exposure.
//
//   node scripts/migrateResumesToPrivate.js          show what would happen
//   node scripts/migrateResumesToPrivate.js --apply  do it
//
// Safe to run more than once: rows already holding a path are skipped.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../db');
const { PRIVATE_BUCKET, BUCKET, isStoredPath, isLocalDiskPath, pathFromPublicUrl } = require('../utils/supabaseStorage');

const APPLY = process.argv.includes('--apply');

function client() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  const { createClient } = require('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function ensurePrivateBucket(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  const existing = buckets.find((b) => b.name === PRIVATE_BUCKET);
  if (!existing) {
    if (!APPLY) return console.log(`would create the private bucket "${PRIVATE_BUCKET}"`);
    const { error: createError } = await supabase.storage.createBucket(PRIVATE_BUCKET, { public: false });
    if (createError) throw createError;
    console.log(`created the private bucket "${PRIVATE_BUCKET}"`);
  } else if (existing.public) {
    if (!APPLY) return console.log(`would mark "${PRIVATE_BUCKET}" private (it is currently public)`);
    const { error: updateError } = await supabase.storage.updateBucket(PRIVATE_BUCKET, { public: false });
    if (updateError) throw updateError;
    console.log(`marked "${PRIVATE_BUCKET}" private`);
  } else {
    console.log(`private bucket "${PRIVATE_BUCKET}" is ready`);
  }
}

// Copies one object from the public bucket to the private one. Returns the
// path it now lives at, or null when the source file has already gone.
async function copyToPrivate(supabase, storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) {
    console.log(`    ! cannot read ${storagePath} from ${BUCKET}: ${error.message}`);
    return null;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(PRIVATE_BUCKET).upload(storagePath, buffer, {
    contentType: data.type || 'application/octet-stream',
    upsert: true
  });
  if (uploadError) throw uploadError;
  return storagePath;
}

(async () => {
  const supabase = client();
  console.log(APPLY ? '=== applying ===\n' : '=== dry run, nothing will be changed ===\n');
  await ensurePrivateBucket(supabase);

  const profiles = await prisma.studentProfile.findMany({
    where: { resumeUrl: { not: null } },
    select: { id: true, resumeUrl: true, fullName: true }
  });
  const applications = await prisma.application.findMany({
    where: { cvUrl: { not: null } },
    select: { id: true, cvUrl: true }
  });

  const rows = [
    ...profiles.map((p) => ({ kind: 'profile', id: p.id, value: p.resumeUrl, who: p.fullName })),
    ...applications.map((a) => ({ kind: 'application', id: a.id, value: a.cvUrl, who: `application ${a.id}` }))
  ];

  const alreadyPrivate = rows.filter((r) => isStoredPath(r.value));
  const toMove = rows.filter((r) => !isStoredPath(r.value));
  console.log(`\n${rows.length} stored CV references: ${alreadyPrivate.length} already private, ${toMove.length} to move\n`);

  // Several rows can point at the same file, so each file is copied once.
  const movedPaths = new Set();
  const failures = [];

  const localFilesMoved = [];

  for (const row of toMove) {
    // Oldest form: a file on the server's own disk, served openly at
    // /uploads. Those go into the private bucket as well, and the local copy
    // is removed, because that route has no authorization in front of it.
    if (isLocalDiskPath(row.value)) {
      const diskPath = path.join(__dirname, '..', row.value.replace(/^\//, ''));
      const storagePath = row.value.replace(/^\/uploads\//, '');
      const exists = fs.existsSync(diskPath);
      console.log(`  ${row.kind} ${row.id} (${row.who}): local file ${row.value}${exists ? '' : ' [missing on disk]'}`);
      if (!APPLY) continue;

      if (!exists) {
        // The file is gone, so the reference points at nothing. Clearing it
        // is more honest than leaving a link that 404s.
        if (row.kind === 'profile') await prisma.studentProfile.update({ where: { id: row.id }, data: { resumeUrl: null } });
        else await prisma.application.update({ where: { id: row.id }, data: { cvUrl: null } });
        console.log('    file missing; cleared the dead reference');
        continue;
      }

      if (!movedPaths.has(storagePath)) {
        const buffer = fs.readFileSync(diskPath);
        const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(storagePath, buffer, {
          contentType: storagePath.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          upsert: true
        });
        if (error) { failures.push(storagePath); console.log(`    ! upload failed: ${error.message}`); continue; }
        movedPaths.add(storagePath);
        localFilesMoved.push(diskPath);
        console.log('    copied from disk into the private bucket');
      }

      if (row.kind === 'profile') await prisma.studentProfile.update({ where: { id: row.id }, data: { resumeUrl: storagePath } });
      else await prisma.application.update({ where: { id: row.id }, data: { cvUrl: storagePath } });
      console.log('    database row now points at the path');
      continue;
    }

    const storagePath = pathFromPublicUrl(row.value);
    if (!storagePath) {
      console.log(`  ${row.kind} ${row.id}: not a storage URL, leaving alone (${row.value.slice(0, 60)})`);
      continue;
    }
    console.log(`  ${row.kind} ${row.id} (${row.who}): ${storagePath}`);
    if (!APPLY) continue;

    if (!movedPaths.has(storagePath)) {
      const copied = await copyToPrivate(supabase, storagePath);
      if (!copied) { failures.push(storagePath); continue; }
      movedPaths.add(storagePath);
      console.log('    copied into the private bucket');
    }

    if (row.kind === 'profile') {
      await prisma.studentProfile.update({ where: { id: row.id }, data: { resumeUrl: storagePath } });
    } else {
      await prisma.application.update({ where: { id: row.id }, data: { cvUrl: storagePath } });
    }
    console.log('    database row now points at the path');
  }

  if (APPLY && movedPaths.size) {
    // Only once every row is repointed: while a row still held the URL, the
    // public copy was the only thing it could reach.
    const paths = [...movedPaths];
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) console.log(`\n! could not remove the public copies: ${error.message}`);
    else console.log(`\nremoved ${paths.length} public copies from "${BUCKET}"`);
  }

  if (APPLY && localFilesMoved.length) {
    for (const file of localFilesMoved) {
      try {
        fs.unlinkSync(file);
        console.log(`removed the local copy ${path.relative(path.join(__dirname, '..'), file)}`);
      } catch (error) {
        console.log(`! could not remove ${file}: ${error.message}`);
      }
    }
  }

  if (failures.length) {
    console.log(`\n${failures.length} file(s) could not be read and were left as they were:`);
    failures.forEach((f) => console.log(`  ${f}`));
  }

  console.log(APPLY ? '\ndone' : '\ndry run complete; pass --apply to carry it out');
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error('migration failed:', error.message);
  await prisma.$disconnect();
  process.exit(1);
});
