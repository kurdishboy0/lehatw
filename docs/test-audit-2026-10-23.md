# Lehatw test audit, October 23, 2026

The initial audit added 412 checks to the 26 existing checks. Its coverage run executed 438 checks in 21 test files: **424 passed and 14 failed**, with zero skipped or TODO cases. The failures represented **11 distinct application findings**, detailed below. The initial audit changed no production application logic or live data.

**Follow-up fixes:** all 11 findings have now been corrected in the source, retaining all 14 original regression assertions. Additional checks bring the suite to **482 passing checks across 23 files, zero failures/skips/TODOs**. This includes actual login/signup component rendering in English, Arabic and Kurdish. ESLint and the production build pass. A read-only lookup for a nonexistent profile also confirmed the changed Prisma privacy query is valid against the configured database. No real account or record was modified by that check.

LinkedIn's existing implementation and local credentials were present. Netlify's build configuration lacked `VITE_LINKEDIN_CLIENT_ID`, so the buttons were hidden in that deployment. The public client ID is now configured, and login and talent signup share a state-protected redirect. The backend validates verified email and provider subject before lookup/linking. Render already has corresponding client-ID/secret entries, and its public client ID was checked against the Netlify configuration. A completed real LinkedIn login still depends on the provider's registered callback and the user's consent.

The sections below preserve the original findings and their reproduction details as audit history; they are no longer a list of outstanding source defects.

| Project | Checks | Passed | Failed |
| --- | ---: | ---: | ---: |
| Server | 415 | 401 | 14 |
| Client | 23 | 23 | 0 |
| Total | 438 | 424 | 14 |

Client ESLint and the production Vite build passed with the existing advisory about a JavaScript chunk larger than 500 kB (approximately 951 kB before gzip). The original failures were resolved through application changes, not by skipping or reversing their assertions.

## Findings and proposed correction order

### R11. High priority: LinkedIn accepts missing/unverified email before account lookup

Source: `server/controllers/authController.js`, `linkedinLogin`, around lines 299–329. Two failing tests.

The handler reads `email` and `sub` from LinkedIn userinfo, then looks up an account and issues a JWT without requiring a present, verified email. Tests with `email_verified: false` and with no email both receive HTTP 200 and a local JWT. Google login already has an explicit verified-email check.

For missing email, the constructed Prisma 6 filter contains `equals: undefined`. With the current schema's default undefined handling, that condition can be omitted, making an unintended account match possible. The local regression supplies a controlled existing-account result to demonstrate that the subsequent handler signs it in. This is a code-level reproduction with a provider/database double; no live LinkedIn identity or account takeover was attempted.

Proposed fix: validate provider subject and a normalized, verified email before any lookup/link/create; validate consistency with an existing linked provider subject; return a neutral authentication failure for incomplete/unverified profiles. Test the absent-email lookup behavior against a disposable PostgreSQL database as well. Fix this first.

### R06. High priority: lesson changes bypass course approval

Source: `server/controllers/lessonController.js`, `createLesson` around line 53; the update/delete paths have the same review gap. One failing test.

Editing approved course metadata returns the course to PENDING, but adding a lesson to an approved course creates content without changing its approval status. The test confirms no course review update is made. Enrolled users can therefore receive newly added, unreviewed content.

Proposed fix: define one review policy for lesson creation, edits and deletion on approved courses, apply it atomically with the content change, and notify admins. Preserve enrolled-student access according to an explicitly chosen policy.

### R10. Medium priority: rotating addresses bypass the per-account resend quota

Source: `server/middleware/rateLimit.js`, `perIpAndAccount` around line 18. One failing test.

The single key is `IP|email`. Six requests for the same email from six controlled source addresses all succeed, despite a nominal five-send allowance. The test overrides the address only in its local test server; it does not attack the live site. Similar combined keys are used for login and code checks, but this reproduction exercises code sending.

Proposed fix: use independently enforced account and address limits, with suitable campus/NAT allowances. Retain IPv6 normalization and neutral authentication responses.

### R04. Medium priority: public global search returns CV storage locations

Source: `server/controllers/searchController.js`, `rankedStudents` and response around lines 56–64. One failing test.

The ordinary directory and public profile remove `resumeUrl`, but global search returns the raw profile object. A test profile with a private CV key exposes that key in the public search response. This exposes storage metadata; the private bucket and signed-URL checks still control document download.

Proposed fix: use a shared public-profile response projection or Prisma select in every public discovery endpoint. Include legacy values in regression coverage.

### R02. Medium priority: pending custom skills are public and influence peer matching

Sources: `server/controllers/studentController.js`, `getStudentById` around line 153; `server/controllers/matchController.js`, `PROFILE_INCLUDE` around line 4. Two failing tests.

The public profile includes all custom skills, including `isApproved: false`. Peer matching also loads all custom skills, so two profiles sharing only an unreviewed custom skill can receive a positive recommendation. This weakens the custom-skill approval workflow.

Proposed fix: load only approved custom skills on public/recommendation surfaces. The owner's editing screen should continue to show pending entries with their status.

### R03. Medium priority: account bans do not consistently hide talent from discovery

Sources: `server/controllers/studentController.js`, `getAllStudentsPaginated` around line 101; `server/controllers/searchController.js`, talent query around line 18. Two failing tests.

Neither query has an ACTIVE account predicate. The tests assert the missing query restriction. Newer candidate/peer filters do enforce ACTIVE, so moderation behavior differs between surfaces. The older job-match endpoint also needs the same review when fixing this policy.

Proposed fix: share and consistently apply the intended discoverability predicate to directory/search/profile/matching endpoints. Decide whether public profile URLs should return 404 for suspended/banned accounts.

### R08. Medium priority: an HR account can create a talent profile

Source: `server/routes/studentRoutes.js`, profile route around line 27; `server/controllers/studentController.js`, `createStudentProfile`. One failing HTTP test.

The real route authenticates the request but does not require the STUDENT role. A signed-in HR fixture can create a StudentProfile and receives HTTP 201. The account role remains HR, producing inconsistent talent listings and account behavior.

Proposed fix: enforce the appropriate role on profile creation/edit/upload endpoints and review the equivalent company-profile routes. Preserve legitimate admin workflows through the admin endpoints.

### R05. Medium priority: deleting an instructor omits its restricting profile

Source: `server/controllers/admin/usersController.js`, deletion transaction around lines 292–296; `server/prisma/schema.prisma`, required `InstructorProfile.user` relation. One failing test.

The deletion transaction removes StudentProfile and HRProfile, then User. It does not remove InstructorProfile. That relation has no cascade from User. A regression that simulates this schema-backed foreign-key restriction returns HTTP 500 instead of successful deletion.

Proposed fix: remove the instructor profile in the transaction and deliberately handle its courses/enrollments/material ownership. Verify actual cascade behavior using a disposable database. The audit did not delete any live instructor.

### R01. Medium priority: HR can publish a blank job title

Source: `server/controllers/jobController.js`, `createJobPost` around line 6. One failing test.

An approved company submitting a whitespace-only title receives HTTP 201. The admin-created-job path correctly trims and rejects an empty title, so validation differs between the two entry points.

Proposed fix: share job input validation across HR/admin create and edit. Validate required fields, enum-like selections and skill IDs before writes.

### R07. Medium priority: duplicate IDs pass lesson reorder validation

Source: `server/controllers/lessonController.js`, `reorderLessons` around line 102. One failing test.

For a course with lessons `[101, 102]`, submitting `[101, 101]` passes the length/membership check and returns success. The second lesson is omitted and ordering becomes inconsistent.

Proposed fix: require unique IDs and exact set equality with the course's current lesson IDs. Keep the existing deterministic lock order.

### R09. Medium priority: password-reset length rules differ from registration

Source: `server/controllers/authController.js`, `resetPassword` around line 408. One failing test.

Registration rejects passwords above bcrypt's 72-byte limit. Password reset accepts a 73-byte replacement and returns success, allowing silent bcrypt truncation and inconsistent validation.

Proposed fix: share password validation between registration, password reset and initial setup, using UTF-8 byte length. Test multibyte passwords and every password-setting path.

## What passed

- Talent and company registration, email verification, login and password-reset journeys through the real HTTP routers with isolated persistence.
- Skill-coverage matching, weighted peer similarity, proficiency tie-breaking, missing/duplicate/extra skill cases, and deterministic symmetry/range checks.
- Recommended jobs, HR candidate ownership/ranking, invite messages/notifications/email and duplicate-invite constraints.
- CV access policy for owners, admins, applied-to HR and unrelated users; signed-link expiry, private upload path behavior and storage failure handling.
- Job application identity, CV-required/optional paths, inactive/expired jobs and duplicate applications.
- Admin endpoint role guards; suspension/reactivation, super-admin safeguards, company approval/rejection, skill/catalog merges, account setup links, notifications, audits and analytics.
- Course/event visibility, registration/enrollment rules, previews, progress, course recommendations and standard metadata approval behavior.
- Same-address/account rate limits, successful-login exemption, upload content-type allowlists and file-size limits.
- All literal UI translation keys and their interpolation placeholders in English, Arabic and Kurdish, plus client helper logic.

## Coverage and remaining work

The initial V8 report showed 76.85% line / 73.70% branch coverage across loaded server modules. The follow-up run shows 77.64% line / 74.90% branch coverage. The job-match and similarity utilities have 100% line coverage; CV policy and OTP primitives have 100% line/branch coverage. Client helper coverage increased from 97.87% to 98.23% line coverage; this is **not** whole React-page coverage. Social sign-in rendering is checked separately through Vite's server-rendered components.

This audit is not a full live-site/browser or database integration certification. Remaining verification includes dedicated-database constraints/cascades/rollback/concurrency, actual social-provider payload contracts, deployed storage policy and migration completeness, real email/token longevity, rendered forms/navigation/responsive layouts/accessibility, dynamic i18n keys/plurals and larger datasets. Several admin CRUD/list/error branches remain uncovered; consult the generated coverage table rather than assuming an entire feature is proven by one passing test.

The Google sender's seven-day Testing-mode token remains a separate deployment task, deliberately deferred at the user's request.

Reproduction commands and the complete test-file map are in [testing.md](testing.md). Detailed individual results and coverage are generated locally in `test-results/server.tap`, `test-results/client.tap` and `test-results/summary.json`.
