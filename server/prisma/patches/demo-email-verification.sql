-- Reserved test mailboxes are deliberate fixtures, not deliverable addresses.
-- Preserve their login behavior when email verification becomes mandatory.
-- No real accounts, passwords or account statuses are changed.
UPDATE "User" SET "phoneVerified" = true
WHERE (email = 'admin@lehatw.test' AND role = 'ADMIN')
   OR (email = 'hr@lehatw.test' AND role = 'HR')
   OR (email = 'student@lehatw.test' AND role = 'STUDENT');
