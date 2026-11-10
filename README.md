# College Sports Management & Integrity System

CSMIS is a college sports meet system for November 2026. It covers trusted student imports, meet/event setup, individual and team registration, independent roster review, identity-confirmed check-in, structured results, independent verification, versioned scoring, protests, published results, standings and controlled reports. The checked-in demo migrations use custom staff accounts in `public.users` and do not invent official scoring values. Data added to a configured project must be reviewed separately from these fixtures.

## Prerequisites

- Node.js 22 or newer (required by the installed Supabase JavaScript packages)
- npm
- Supabase CLI and a Docker-compatible container runtime for local database tests

## Setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create local environment configuration:

   ```bash
   cp .env.example .env.local
   ```

   Replace the placeholders with the project URL and publishable key from the Supabase Connect dialog. Never put a secret or `service_role` key in a `NEXT_PUBLIC_` variable.

3. Start Supabase and run all migrations:

   ```bash
   supabase start
   supabase db reset
   ```

4. Run the database security suite:

   ```bash
   supabase test db
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

For the demo accounts, apply migration 011 and run the login browser checks below before using the staff portal.

## Staff login and demo accounts

Apply migrations in filename order through `202611040019_protest_published_result_transition.sql`. Migration 011 adds `public.users.password_hash`, copies the existing demo bcrypt hashes from migration 009, creates private revocable sessions, and restricts the hash column from PostgREST. Migration 012 removes the meet/event RLS read-policy cycle. Migration 013 moves application staff references to `public.users` and repairs the controlled student publication guard. Migration 014 records account removal without erasing audit references. Migration 015 requires at least one event before registration opens and lets an eventless, unscored meet return to draft. Migration 016 freezes event lifecycle changes after a meet is completed, cancelled, or archived. Migration 017 retires the obsolete Supabase Auth metadata importer. Migration 018 permits trusted attendance state changes on locked rosters. Migration 019 lets a valid protest move a published result to disputed without changing its approved payload. The database owner can see the password hash in the SQL editor; browsers and the `authenticated` database role cannot select it. Passwords are never stored in plaintext.

Configure `DATABASE_URL` with the Supabase **Session pooler** PostgreSQL URL, `SUPABASE_JWT_SECRET` with the project's legacy JWT secret, and the existing public URL and publishable key in untracked `.env.local`. Keep both server secrets out of `NEXT_PUBLIC_*` variables. CSMIS verifies credentials through a private PostgreSQL connection and stores an opaque, HTTP-only session cookie. Server-generated, short-lived JWTs let existing PostgreSQL RLS policies enforce each role. The login form does not call Supabase Auth.

The nine mock accounts created in migrations 008–010 are available for testing only in an isolated demo project. Example: `admin@gmail.com` / `admin123`, or `viewer@gmail.com` / `view123`. These published credentials must never be used for real staff or student data. To run the login browser checks against this demo data, set `E2E_DEMO_LOGIN=1` and run `npx playwright test tests/e2e/custom-login.spec.ts`.

Role assignments stay in `public.user_roles`; active status is checked in `public.users` and `public.profiles`. Administrators create staff accounts at `/admin/users` with email, display name, an initial password of at least 12 characters, and a scoped role. The server checks administrator authority again inside the account creation transaction. Apply migration 013 before using this form or student publication.

Apply migration 014 for account management. A system administrator uses the edit, status, and delete icons in `/admin/users`; each opens a confirmation or edit dialog. They can edit an account's name, email, and single role with its required scope, deactivate or reactivate access, and remove it from the active directory. Removal is a soft deletion: the account cannot sign in or be restored through the form, while audit and competition references remain intact. Deactivation revokes active sessions. Administrators cannot remove their own access or the last active administrator. Accounts with multiple roles require a separate role-management decision before their role can be edited.

The seeded demo meet and events may remain in draft/closed state. A system administrator or sports coordinator must open the meet and each event from `/admin/meets` before a house representative can add athletes. The registration cards show the effective state, including the meet registration window. Create participating houses and a sport category first, then add at least one event while the meet is **draft**. Once registration opens, event configuration is locked. An older meet that opened with zero events can be returned to draft from `/admin/meets` if it has no scoring data.

In **Scoring policy**, an administrator or sports coordinator creates a versioned policy for a meet, enters official placement points, and submits it for independent approval. A different authorized manager activates the policy. The active version can then be assigned to an event in the same meet with an audit reason. The application does not invent official point values, and existing approved awards retain their scoring-rule version.

## Student import procedure

Apply `202611050020_optional_student_house_import.sql` after migration 019 before importing students without houses. It allows unassigned students in the official register while competition registration still requires a house.

1. Sign in as a system administrator or registration officer and open `/admin/imports`.
2. Upload a CSV or `.xlsx` file no larger than 5 MB and 5,000 data rows. Legacy `.xls` and macro-enabled files are rejected.
3. Inspect the preview and map student number, academic status, and either full name or separate first and last name columns. For the illustrated college workbook, map **Student ID → Student number**, **Name → Full name**, and **Status → Academic status**; leave House unmapped. `CURRENT` becomes `enrolled`, while `GRADUATED` becomes `graduated`. Email, Course, Active, and Last login are ignored; they do not establish sports eligibility.
4. Validate the complete file. With Full name, the first word becomes first name, the last word becomes last name, and middle words become other names. Review these separate preview columns, especially for compound surnames. Resolve duplicate numbers, existing-record conflicts, missing fields, and any supplied house names/codes that do not match an active house.
5. Explicitly confirm the staged batch. Valid rows are created without overwriting existing students; rejected rows remain in the protected batch ledger and can be exported as CSV.
6. Assign a house later in the student record if the source has no house, then verify competition eligibility separately. Importing a student never makes the student eligible. An unassigned student cannot be placed on a house roster.

The application parses files in trusted server code, never executes formulas or macros, and does not persist the uploaded source file. Do not commit real student files or exported error reports to Git.

## Meet and athlete-registration procedure

1. A system administrator or sports coordinator creates the meet at `/admin/meets`, sets its registration window, participating houses, sport categories, events, formats, schedules, limits, and rules while it is **draft**, then opens registration. At least one event is required. Configuration becomes immutable once registration opens. When registration ends, close the meet before opening event check-in; after the event starts, move the meet to `in_progress` before moving the event to `in_progress`.
2. A house representative opens `/registration`, selects an event, creates teams where required, adds only enrolled and verified-eligible students from their own house, then explicitly submits the roster.
3. A different administrator, coordinator, or registration officer reviews the submission at `/admin/registrations`. The submitter cannot approve the same roster.
4. After registration closes and every submitted roster has a decision, an authorized reviewer locks the event roster. Locking is irreversible through ordinary workflows.
5. Any post-lock addition starts as a reasoned house request. Only a system administrator or sports coordinator other than the requester can approve it; the decision and resulting registration remain auditable.
6. After lock, an authorized user may issue or rotate an opaque QR pass. Only a hash is stored. A meet manager must separately change the event lifecycle from `scheduled` to `check_in_open` in meet configuration. Registration being open does not open check-in. An assigned check-in officer opens `/check-in`, selects the event, uses **Scan QR pass** to start the camera (localhost or HTTPS and camera permission required), types the token if needed, or selects the reasoned manual fallback. They must confirm physical identity before attendance is recorded. If the event is still scheduled, the page displays the blocking status and disables attendance submission.
7. Attendance corrections require an independent administrator/coordinator, a reason, and an immutable correction entry.

After independent roster approval and lock, an authorized staff member issues a registration QR pass. The pass contains an opaque token; the database stores its hash. At the event, the assigned check-in officer scans or enters the token, physically confirms the athlete against the approved entry, then records attendance. A missing pass uses the reasoned manual fallback. Scanning alone does not prove identity or mark attendance. The house representative submits the roster for review; the submitter cannot approve it.

The house representative downloads the QR image from an approved entry and hands the saved or printed pass to the athlete after checking identity. The application does not email or message passes automatically. Assigned judges can see scheduled events in their workspace; result entry becomes available only when the event is in progress or completed.

Do not print or distribute a pass until its athlete and event details have been independently checked. A QR token is an identifier, not proof of identity.

## Results, scoring and protest procedure

1. An assigned event judge records a checked-in individual or approved team at `/result-entry` while the event is in progress or completed, then submits the structured result.
2. A different results verifier reviews at `/admin/results`. A coordinator/administrator who is neither submitter nor verifier performs final approval and intentional publication.
3. Scoring managers configure the official position table at `/admin/scoring`. The creator submits it and a different manager activates it. No values are preloaded.
4. Corrections use a reasoned request and independent decision. Approval voids active awards and sends the result through verification and scoring again; history is never overwritten.
5. An administrator/coordinator configures the meet's approved protest grounds. A house representative files at `/protests` against one of those grounds before the configured deadline. Only an assigned, conflict-free committee reviewer can decide the case.
6. `/public/results` and `/standings` expose intentionally published information only. Standings begin as provisional and require explicit, audited confirmation and final declaration. `/admin/reports` records staff exports, while `/admin/audit` exposes protected audit metadata without payload snapshots.
7. Assignment and decision notices are available to their recipient at `/notifications`.

Start with the [illustrated workflow manual](docs/CSMIS_Workflow_Manual.pdf) for meet recovery and a role-by-role walkthrough. The editable generator is `scripts/generate_workflow_manual_pdf.py` (run with Python and ReportLab). See also [competition workflow](docs/competition-workflow.md), [presentation walkthrough](docs/presentation-runbook.md), [scoring policy](docs/scoring-policy.md), and the [operations runbook](docs/operations-runbook.md).

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
supabase test db
```

`npm run check` combines the first three application checks. Playwright installs Chromium with `npm run test:e2e:install`; its authenticated workflow requires the synthetic `E2E_*` values documented in `.env.example` and otherwise skips that one scenario. Database tests are separate because they require a running local Supabase stack.

The production build uses Next.js's supported Webpack option because Turbopack's CSS worker crashes in the current Windows environment. To run the transaction-wrapped database tests against a configured demo project when the local Supabase stack is unavailable, run `node --env-file=.env.local scripts/run-db-suite.mjs`. This command requires a privileged PostgreSQL connection and must never be run against a database containing real student data without an approved test plan.

## Project structure

```text
app/                  Public and server-protected App Router routes
components/admin/     Responsive administrative shell and shared states
components/ui/        Owned UI primitives
features/houses/      House validation, server actions, and management UI
features/students/    Official register and eligibility workflows
features/imports/     Parser, validation, staging, confirmation, and reports
features/meets/       Meet, category, event, schedule, and status management
features/registrations/ House rosters, review, locking, passes, and exceptions
features/check-in/    Assigned-event QR and manual attendance workflows
features/results/     Structured result entry, review, correction, publication
features/scoring/     Versioned position rules, assignment, awards, standings
features/protests/    Filing, evidence references, reviewers, and decisions
app/notifications/    Account-scoped assignment and decision notices
lib/auth/             Server-side authorization boundary
lib/supabase/         Browser/server clients and session-refresh proxy
supabase/migrations/  Ordered PostgreSQL changes
supabase/tests/       Transactional pgTAP security tests
tests/                Application unit tests
docs/                 Architecture and security documentation
```

See [architecture](docs/architecture.md) for design decisions and [security](docs/security.md) for the role-permission matrix and enforcement details.

## Database changes

Create a new timestamped SQL migration for every schema change. Do not edit a migration already applied to a shared environment. Migration `202610270003_meets_events_registrations.sql` adds meet operations; `202610270004_results_scoring_integrity.sql` adds schedules, results, scoring, protests, notifications and report metadata. Do not enter scoring values until the college approves them. Draft values never affect standings, and activation requires a different authorized manager.

## Deployment outline

1. Create separate Supabase projects for non-production and production environments.
2. Run the migration and security test suite in non-production.
3. Configure the project URL and publishable key as browser-visible variables, and `DATABASE_URL` and `SUPABASE_JWT_SECRET` as server-only Vercel variables. Never expose the latter two to the browser.
4. Run the CI application checks and database tests.
5. Deploy to Vercel, then perform a real authentication and authorization smoke test before enabling staff access.

The checked-in demo account passwords are public test credentials. Rotate or replace **every** demo account and test the replacement credentials before connecting real student records or opening a production staff portal. Review the security and operations runbooks, database backup/restore, authorization tests, and credential rate limiting before production launch. The neutral CSMIS visual identity is a placeholder. Apply official college assets only after brand files and usage guidelines are supplied.
