# CSMIS architecture

## Scope

This repository is the secure foundation for a complete college sports workflow. It implements meet/event configuration, eligibility-gated rosters, attendance, structured results, independent review/corrections, versioned scoring, protests, publication and controlled reports. It intentionally contains no operational seed data, official points table or claim that authentication is working. A real Supabase project, provider configuration and security tests remain deployment prerequisites.

## Folder structure

```text
app/                         Next.js App Router routes and route-level states
components/
  admin/                     Administrative navigation and reusable route states
  layout/                    Shared institutional application shell
  ui/                        Owned UI primitives
features/
  foundation/                Feature-owned presentation for this milestone
  houses/                    House schemas, actions, and management interface
  imports/                   File parsing, validation, staging, and reports
  meets/                     Meet, category, event, schedule, and state actions
  registrations/             House entry, review, lock, pass, and exception UI
  check-in/                  Assigned-event attendance actions and UI
  results/                   Structured performances and lifecycle actions
  scoring/                   Official policy versions and point generation
  protests/                  Integrity cases, evidence and decisions
  public-scoreboard/         Public house and event competition presentation
  students/                  Student record and eligibility workflows
  users/                     Controlled profile and role provisioning
lib/
  auth/                      Server authorization and role definitions
  supabase/                  Browser, server, and request-proxy clients
  env.ts                     Runtime environment validation
  utils.ts                   Shared class-name utility
supabase/
  migrations/                Ordered, immutable database migrations
  tests/database/            Transactional pgTAP security tests
docs/                        Architecture and security decisions
```

Future capabilities should be grouped under `features/<capability>` (for example `features/registration` or `features/results`) and expose a small public interface to routes. Generic UI primitives belong in `components/ui`; domain components do not.

## Application boundary

- Next.js 16 App Router renders the shell and future feature routes.
- `proxy.ts` refreshes Supabase SSR sessions using verified claims and returns the response carrying refreshed cookies and private-cache headers.
- Browser code receives only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key. A service-role or secret key must never use the `NEXT_PUBLIC_` prefix or be referenced by browser modules.
- PostgreSQL is the authorization boundary. UI visibility is a convenience, not a security control.
- Every administrative layout and sensitive server action independently resolves verified claims and current database roles. The browser never supplies an authoritative role.

## Import boundary

The import workflow has four explicit phases: upload/preview, mapping, complete validation, and confirmation. CSV uses Papa Parse and `.xlsx` uses `read-excel-file`; spreadsheet formulas and macros are not evaluated. Files are capped at 5 MB and 5,000 rows and are not stored after parsing.

Validation produces immutable staging rows and a batch summary. Confirmation calls a restricted `SECURITY DEFINER` function, which locks the batch and rechecks required values, active houses, duplicates, and current student-number conflicts before each insert. Existing records are never silently overwritten. Mixed batches record accepted and rejected totals, and imported students always begin as `unverified`.

## Data model decisions

### Meet and event lifecycle

Meet configuration follows `draft → registration_open → registration_closed → in_progress → completed → archived`, with controlled cancellation paths. The database rejects skipped or reversed transitions. Dates, registration windows, and core meet configuration become immutable after registration opens. Participating houses are explicit through `meet_houses`; sport categories belong to one meet, and every event category, schedule, and optional scoring-rule reference must belong to that same meet.

Events support individual and team formats and follow `scheduled → check_in_open → in_progress → completed`. Check-in cannot open before roster lock. `event_heats` provides schedule structure only; this milestone does not calculate results or progression.

### Identity and authorization

`students` is the college register and is deliberately independent of `auth.users`. A student is not required to have a login. `profiles` and `user_roles` extend authenticated accounts only.

Roles can be global, house-scoped, or event-scoped. House representatives require a `house_id`; event judges require an `event_id`. This avoids granting every judge access to every event.

Every staff role enters through the central `/login` page and is sent to `/workspace`, where links are filtered to its active assignments. This is a usability layer only: each destination and mutation independently repeats authorization. Staff provisioning accepts only an existing Supabase Auth UUID and runs through an administrator-only database function; authentication secrets never pass through application tables.

Academic status and competition eligibility are separate fields. Eligibility transitions use a database function and append to `student_eligibility_history`; direct eligibility updates are rejected. House deactivation is non-destructive, and foreign keys prevent deletion of a house with linked records.

Public result identity is also separate from the legal student record. A restricted workflow records the approved public name and publication authority. The public scoreboard function returns that name only when authority exists; otherwise it returns `Name withheld` and never exposes student numbers or legal identity fields.

### Individual and team entries

Each row in `event_registrations` represents one student. Individual entries have no team; team members reference an `event_teams` record and share its stable identifier. Registration functions recheck enrollment, eligibility, house membership, participation, time windows, duplicate entries, participant limits, and team bounds in PostgreSQL. `event_roster_submissions` separates house submission from independent approval. `registration_history` preserves every state change, while event roster lock is irreversible through the ordinary workflow.

Post-lock additions use `roster_change_requests`. They require a reason and an administrator/coordinator decision by someone other than the requester. The trusted function temporarily authorizes only the approved insert; ordinary writes remain blocked by the roster guard.

### Check-in and attendance

`registration_tokens` stores only a SHA-256 hash of a randomly generated opaque token. The raw value is returned once for QR generation and rotation revokes the previous token. A token works only for its approved event registration, during `check_in_open`, and never substitutes for physical identity confirmation. A partial unique index prevents duplicate active attendance. Manual fallback requires an assigned officer, confirmed identity, and a reason.

Attendance is not deleted when corrected. An independent administrator/coordinator voids it with a reason, restores the registration to approved, and appends an `attendance_corrections` record.

### Results and points

The result lifecycle includes `draft → submitted → verified → approved → final → published`, with rejected and disputed paths. Each insert or update creates an append-only `result_revisions` snapshot. Critical performance values are typed columns; JSON remains a compatibility snapshot rather than the only source of truth.

Official position values live in `scoring_rule_positions`. A creator cannot activate their own version. `point_awards` references the result, approved revision and exact rule version. Recalculation voids rather than deletes the prior award, and a partial unique constraint permits exactly one active award.

Verified or published corrections require a structured request, a different approver, a new revision, re-verification and recalculation. Protest ground categories are meet-specific and configured by administrators/coordinators; free-form unapproved category codes are rejected. Protests preserve the prior result state, evidence references, reviewer assignment, findings and decision. Reviewer assignment/decision checks filer and house conflicts. Public standings use a security-invoker view, include only non-voided awards backed by published results, show house and event totals, and carry an explicit provisional/confirmed/final declaration state.

### Audit trail

Triggers write old and new row snapshots to `audit_logs` after successful changes to sensitive entities. Audit rows, result revisions, and point awards are append-only. Database triggers protect these invariants even when a caller bypasses the application interface.

## Known foundation boundaries

- Event-judge assignment is event-scoped; check-in and verifier roles are global in this initial model. Add meet/event scope before production if staffing requires narrower access.
- Check-in officers hold a global account role but must also be assigned in `event_officials` for each event they operate. Administrators/coordinators retain operational override access.
- Sport-specific validation beyond the implemented positive values, outcomes, placement and tie invariants still requires the college's confirmed event rules.
- Authentication providers, redirect URLs, email delivery, and account onboarding are not configured here.
- Role administration is currently read-only in the application. Initial provisioning and exceptional role changes use a controlled database-owner path; ordinary Data API self-escalation remains denied.
- College branding remains intentionally neutral until approved assets and guidelines are supplied.
