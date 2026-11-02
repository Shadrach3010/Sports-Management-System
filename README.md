# College Sports Management & Integrity System

CSMIS is a secure, integrated foundation for managing the college's November 2026 sports meet. It covers trusted student imports, meet/event setup, individual and team registration, independent roster review, identity-confirmed check-in, structured results, independent verification, versioned scoring, protests, published results, standings and controlled reports. It contains no production student data, no invented official scoring values, and does **not** claim that authentication works until a real Supabase project and sign-in flow are configured and tested.

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

Apply migrations in filename order through `202611020011_custom_staff_login.sql`. Migration 011 adds `public.users.password_hash`, copies the existing demo bcrypt hashes from migration 009, creates private revocable sessions, and restricts the hash column from PostgREST. The database owner can see this hash in the SQL editor; browsers and the `authenticated` database role cannot select it. Passwords are never stored in plaintext.

Configure `DATABASE_URL` with the Supabase **Session pooler** PostgreSQL URL, `SUPABASE_JWT_SECRET` with the project's legacy JWT secret, and the existing public URL and publishable key in untracked `.env.local`. Keep both server secrets out of `NEXT_PUBLIC_*` variables. CSMIS verifies credentials through a private PostgreSQL connection and stores an opaque, HTTP-only session cookie. Server-generated, short-lived JWTs let existing PostgreSQL RLS policies enforce each role. The login form does not call Supabase Auth.

The nine mock accounts created in migrations 008–010 are available for testing only in an isolated demo project. Example: `admin@gmail.com` / `admin123`, or `viewer@gmail.com` / `view123`. These published credentials must never be used for real staff or student data. To run the login browser checks against this demo data, set `E2E_DEMO_LOGIN=1` and run `npx playwright test tests/e2e/custom-login.spec.ts`.

Role assignments stay in `public.user_roles`; active status is checked in `public.users` and `public.profiles`. Existing legacy staff provisioning functions still reference `auth.users` and are not a custom-account creation workflow. New staff account provisioning needs a separate controlled implementation before operational use.

## Student import procedure

1. Sign in as a system administrator or registration officer and open `/admin/imports`.
2. Upload a CSV or `.xlsx` file no larger than 5 MB and 5,000 data rows. Legacy `.xls` and macro-enabled files are rejected.
3. Inspect the preview and map student number, first name, last name, academic status, and house; other names are optional.
4. Validate the complete file. Resolve duplicate numbers, existing-record conflicts, missing fields, and house names/codes that do not match an active house.
5. Explicitly confirm the staged batch. Valid rows are created without overwriting existing students; rejected rows remain in the protected batch ledger and can be exported as CSV.
6. Verify competition eligibility separately. Importing a student never makes the student eligible.

The application parses files in trusted server code, never executes formulas or macros, and does not persist the uploaded source file. Do not commit real student files or exported error reports to Git.

## Meet and athlete-registration procedure

1. A system administrator or sports coordinator creates the meet at `/admin/meets`, sets its registration window, participating houses, sport categories, events, formats, schedules, limits, and rules, then opens registration. Configuration becomes immutable once registration opens.
2. A house representative opens `/registration`, selects an event, creates teams where required, adds only enrolled and verified-eligible students from their own house, then explicitly submits the roster.
3. A different administrator, coordinator, or registration officer reviews the submission at `/admin/registrations`. The submitter cannot approve the same roster.
4. After registration closes and every submitted roster has a decision, an authorized reviewer locks the event roster. Locking is irreversible through ordinary workflows.
5. Any post-lock addition starts as a reasoned house request. Only a system administrator or sports coordinator other than the requester can approve it; the decision and resulting registration remain auditable.
6. After lock, an authorized user may issue or rotate an opaque QR pass. Only a hash is stored. An assigned check-in officer opens `/check-in`, selects the event, scans/types the token or uses the documented manual fallback, and must confirm the physical identity before attendance is recorded.
7. Attendance corrections require an independent administrator/coordinator, a reason, and an immutable correction entry.

Do not print or distribute a pass until its athlete and event details have been independently checked. A QR token is an identifier, not proof of identity.

## Results, scoring and protest procedure

1. An assigned event judge records a checked-in individual or approved team at `/result-entry` while the event is in progress or completed, then submits the structured result.
2. A different results verifier reviews at `/admin/results`. A coordinator/administrator who is neither submitter nor verifier performs final approval and intentional publication.
3. Scoring managers configure the official position table at `/admin/scoring`. The creator submits it and a different manager activates it. No values are preloaded.
4. Corrections use a reasoned request and independent decision. Approval voids active awards and sends the result through verification and scoring again; history is never overwritten.
5. An administrator/coordinator configures the meet's approved protest grounds. A house representative files at `/protests` against one of those grounds before the configured deadline. Only an assigned, conflict-free committee reviewer can decide the case.
6. `/public/results` and `/standings` expose intentionally published information only. Standings begin as provisional and require explicit, audited confirmation and final declaration. `/admin/reports` records staff exports, while `/admin/audit` exposes protected audit metadata without payload snapshots.
7. Assignment and decision notices are available to their recipient at `/notifications`.

See [competition workflow](docs/competition-workflow.md), [scoring policy](docs/scoring-policy.md), and the [operations runbook](docs/operations-runbook.md).

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
3. Configure only the project URL and publishable key in Vercel's browser-visible environment variables.
4. Run the CI application checks and database tests.
5. Deploy to Vercel, then perform a real authentication and authorization smoke test before enabling staff access.

The neutral CSMIS visual identity is a placeholder. Apply official college assets only after brand files and usage guidelines are supplied.
