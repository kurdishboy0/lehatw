# Server regression tests

Run `npm test` from `server/`. The suite uses Node's built-in test runner and the existing server dependencies.

Coverage includes the Iraq-time deadline cutoff, invalid/past dates, optional deadlines, job creation, rejection of late applications, CV requirements, duplicate applications, hiding stored CV paths, registration validation, mandatory email verification, email-only OTP delivery, password-reset privacy, mail-provider failures, contact-number normalization and ownership, and custom field-of-study filters.

Database, file storage, notifications and outbound mail are stubbed. These tests do not need `.env`, send emails or alter shared data. They are controller/unit regression checks, not a substitute for testing deployed provider credentials.

For the existing shared database, the nullable deadline column is added with the idempotent SQL patch `prisma/patches/application-deadline.sql`. Apply that patch before deploying the updated server against an older database. New databases created from `schema.prisma` already include it.

`prisma/patches/demo-email-verification.sql` pre-verifies only the three exact seeded test accounts whose reserved `.test` addresses cannot receive mail. The seed script does the same for new test databases. It does not verify real signups.
