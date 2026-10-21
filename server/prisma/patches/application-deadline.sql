-- Additive, idempotent patch for the existing shared database. No rows change.
ALTER TABLE "JobPost" ADD COLUMN IF NOT EXISTS "applicationDeadline" TIMESTAMP(3);
