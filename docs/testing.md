# Automated testing

Run from the repository root with Node.js 24 and the client/server dependencies installed:

```sh
npm test
npm run test:coverage
```

Both commands run **both projects**, even if the server tests fail. No additional testing framework or paid service is required. The suite uses Node's built-in `node:test` and `node:assert/strict`. Vite loads the client's real translation resources for the language checks.

Project-specific commands:

```sh
npm --prefix server test
npm --prefix server run test:regressions
npm --prefix client test
npm --prefix client run lint
npm --prefix client run build
```

The complete server command includes `tests/regressions/*.test.js`. Those assertions originally failed for the issues documented in [the October 23 audit](test-audit-2026-10-23.md), and now pass after the fixes. No case was skipped, marked TODO, or changed to assert the buggy behavior. `npm test` returns a nonzero exit code whenever a regression returns.

## Test map

| File in `server/tests/` | What it checks |
| --- | --- |
| `authentication.test.js` | Talent/company/instructor registration; forbidden admin self-registration; duplicate/invalid credentials; bcrypt hashing; verified-email login requirement; one-day JWTs; hashed OTPs, expiry and sequential replay; reset passwords; bans and suspensions; database-backed roles; deleted accounts; old sessions after password changes; admin guards. |
| `auditFixes.test.js` | Follow-up checks for approved-only custom skills, public CV projection, inactive profile visibility, shared job input validation, multibyte password boundaries and lesson review on update/delete/reorder. |
| `socialAuthentication.test.js` | Google audience and email verification checks, token/profile identity consistency, provider failure, existing company roles and bans; LinkedIn callback selection for localhost/Netlify and provider failure. |
| `apiWorkflows.test.js` | Two multi-step journeys through the real Express routers: talent registration → verify email → login → create profile → save skills → get job recommendations → apply → duplicate protection → reset password → log in with replacement; company registration → verification → pending approval → admin approval → job publication/edit → admin removal → blocked reactivation → restoration → deletion. |
| `matchingEngine.test.js` | Skill coverage; duplicates; missing/extra skills; proficiency tie-breaking; weighted Jaccard boundaries and symmetry across deterministic inputs; shared skills; English/Arabic/Kurdish skill text; typo/catalog folding. |
| `studyFieldFilter.test.js` | A study field finds translated profile majors as well as associated catalog skills; unknown categories cannot broaden the public search. |
| `recommendations.test.js` | Talent job matches and applied/invited flags; candidate ranking, company ownership and contact rules; invitations, duplicate/application/deadline constraints, messages and email; peer ranking, field normalization, limits and opt-in email privacy. |
| `talentProfile.test.js` | Profile creation/update ownership; privacy toggle types; public/owner CV redaction; owner/admin/applied-HR CV access; denied-user responses; signed URLs; private resume uploads; photo uploads; storage outages; catalog folding and approved custom-skill preservation. |
| `jobsApplications.test.js` | Approved-company gate; role and ownership rules; company job creation/edit/delete; moderation restrictions; application identity, saved/new/optional CVs, inactive jobs; applicant/history privacy; per-application CV authorization; admin-created jobs. |
| `adminManagement.test.js` | User search/filter/pagination; suspend/ban/reactivate; reasons and expiry; self/other-admin/last-super-admin restrictions; role promotion; manual verification; password reset and audit exclusion; deletion safeguards/file ownership; admin-created accounts and hashed setup links; invalid setup tokens; company approvals/rejections; custom-skill merge; job moderation; report resolution. |
| `analyticsAudit.test.js` | Platform totals, verification rate including an empty platform, demand/supply, Iraq-date signup trends, pending counts, public stats, real audit-write utility, filtered audit viewer; instructor resubmission; valid account setup. |
| `communicationCatalog.test.js` | Messaging validation/identity/thread isolation and email failure; notification ownership; reports, deduplication and daily cap; catalog translations/duplicates/creation/deletion safeguards/merge; translation edits and validation; announcement creation and date validation. |
| `learningEvents.test.js` | Event join-link privacy, publication, registration/cancellation, dates and capacity validation; course previews/enrollment/ownership/review; course recommendations from missing job skills; lesson progress/completion and reversal. |
| `httpPermissions.test.js` | Actual HTTP requests against every current admin endpoint, checking guest/talent/company/instructor denial; unauthenticated rejection on protected student/HR/jobs/skills/match/application/messages/notifications/reports/events/courses/instructor routes; ordinary-admin denial on super-admin routes; guest browse availability. Admin endpoints are enumerated from the actual router. |
| `rateLimiting.test.js` | Real limiter middleware over HTTP: login failures versus successful logins, code guessing, resend quotas, email normalization, account isolation and bulk registration. |
| `uploads.test.js` | Real Multer multipart handling: supported photo/PDF/Word types, disallowed declared types, required/optional uploads, wrong field names, 5 MB photo and 10 MB CV limits. |
| `storage.test.js` | Real storage utility with SDK double: private CV versus public photo buckets, returned paths versus URLs, 900-second signatures, existing buckets, provider/configuration failures, legacy paths and bucket-specific cleanup. |
| `regressions/discoveredIssues.test.js` | Fourteen expected-correct assertions protecting the 11 resolved audit findings, including issues affecting multiple surfaces. |
| `qaFlows.test.js` | Previous QA regressions: verification delivery, email validation, application deadlines and CV handling, custom field filtering and contact ownership. |
| `jobDeadline.test.js` | Iraq-inclusive calendar deadlines, malformed/past dates, omission versus explicit clearing, job-open status and browse predicates. |
| `emailDelivery.test.js` | Gmail HTTPS MIME delivery/access-token reuse, blocked Render SMTP and incomplete configuration. All network calls are doubles. |
| `contactPhone.test.js` | Arabic/Kurdish phone-digit normalization and invalid contacts. |

`client/tests/clientLogic.test.js` checks client email validation, all three language directions/digits, isolated localized dates, deadline boundaries, session persistence/corrupt JSON/logout, the HTML-for-JSON API response guard, all statically named `t('…')` keys in en/ar/ckb, and matching interpolation placeholders.

`client/tests/linkedinFlow.test.js` checks shared OAuth state storage/callback construction, requires the public LinkedIn client ID in Netlify's build configuration, and renders the actual login/registration components with that configuration in all three languages to verify LinkedIn appears below Google. It uses server rendering and does not authorize a real social account.

`client/tests/navigationLayout.test.js` verifies role-specific dashboard/tools (including instructors without admin entries) and renders the shared talent card in all three languages, retaining profile/message links, both API skill shapes and opt-in contact display. Together the current isolated suite has 491 checks. Responsive layout, footer page-top navigation and Back scroll restoration were also checked in a real browser at phone, tablet and desktop widths; these visual checks are separate from the automated count.

## Isolation and limits

- Tests do not load `.env`, connect to the shared database, use deployed accounts, send real emails or upload/delete real files. Each test file runs in its own Node process. Test secrets and mailbox addresses are fabricated.
- `helpers/harness.js` replaces Prisma and external side effects with process-local doubles. Unexpected database operations fail the fixture explicitly. Its network guard permits only the ephemeral `127.0.0.1` HTTP servers used by the route tests.
- HTTP tests exercise the real routers, controllers, JWT verification, bcrypt, limiters, JSON and multipart handling. They are HTTP integration tests with persistence doubles, not live PostgreSQL end-to-end tests.
- The transaction double does **not** simulate PostgreSQL locking, rollback, cascades, uniqueness races or isolation. The instructor-deletion regression explicitly simulates a restrictive foreign key supported by the current schema. These behaviors still require a separate disposable database for deployment-level proof.
- Provider tests use controlled Google/LinkedIn/Gmail/Supabase responses. They do not prove a real provider's uptime, consent settings, token renewal, inbox placement or the deployed bucket configuration.
- Client tests cover logic, translation resources and server-rendered social sign-in components. Responsive layouts, browser navigation, keyboard behavior and visual accessibility still need browser checks. Dynamic translation keys and plural selection need additional checks.
- Coverage describes modules actually loaded by the tests. It is not proof of complete website correctness, and the high client percentage applies only to the imported helper modules, not all React pages.

## Reports

The root runner saves ignored local artifacts under `test-results/`:

- `summary.json`: server/client counts, exit status and timestamp.
- `server.tap` and `client.tap`: individual results, failures and (when requested) coverage tables.

Keep the report directory out of source control. A CI workflow can run `npm test`; the command returns failure for unresolved logic errors.
