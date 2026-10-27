# Security model

## Principles

- Deny by default: every exposed table has RLS enabled and tables receive only the SQL operations needed by implemented policies.
- Enforce integrity in PostgreSQL: roster locks, result transitions, approval separation, ledger immutability, and award uniqueness are not client-side rules.
- Scope authority: house representatives are bound to a house and judges to an event.
- Keep secrets server-side: the application needs only a public Supabase URL and publishable key for this milestone. No service-role client exists in the codebase.
- Preserve evidence: changes create audit and result-revision records instead of replacing the only historical copy.

## Role-permission matrix

| Role                 | Configuration / rosters                                 | Check-in                                    | Results / scoring                                                                          | Protests                                          | Student / audit data                              |
| -------------------- | ------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------- |
| System administrator | Manage; review, lock and approve independent exceptions | All events; independent corrections         | Final approval, publication, scoring approval and declaration, subject to separation rules | Assign reviewers; no conflicted decision          | Manage register/roles; read audit                 |
| Sports coordinator   | Manage; review, lock and approve independent exceptions | All events; independent corrections         | Final approval, publication, scoring approval and declaration, subject to separation rules | Operational read                                  | Read register; read audit                         |
| Registration officer | Read; register, review and lock                         | Read only                                   | Published read                                                                             | None                                              | Manage register/import/eligibility; no audit read |
| House representative | Own-house draft, submit and withdraw before lock        | Issue own-house passes; no attendance write | Published read                                                                             | File own-house case before deadline; no decision  | Read own-house register only                      |
| Check-in officer     | Assigned-event approved roster read                     | Record assigned-event attendance            | Published read                                                                             | None                                              | Minimum assigned-event identity data only         |
| Event judge          | Assigned-event roster read                              | None                                        | Submit assigned-event results; cannot verify or approve                                    | None                                              | Minimum assigned-event data only                  |
| Results verifier     | Read configuration                                      | None                                        | Independently verify/reject and request correction; cannot final-approve                   | Relevant case read                                | No general private-register write; no audit read  |
| Protest committee    | Published/configured read                               | None                                        | Relevant disputed-result read                                                              | Assigned conflict-free investigation and decision | No register or general audit access               |
| Public viewer        | Published configuration only                            | None                                        | Published results, active awards and declared standings only                               | None                                              | None                                              |
| Anonymous visitor    | Published configuration only                            | None                                        | Published results, active awards and declared standings only                               | None                                              | None                                              |

“Own roles only” means the account may inspect its assignments; it cannot create or change them. Initial administrator bootstrapping must be performed through a trusted database administration path, not through a public API.

For Milestone 2 house administration, system administrators and sports coordinators can create, edit, activate, and deactivate houses. Registration officers can read active and inactive houses to maintain official assignments but cannot change a house. Other authenticated roles see only active houses. Only system administrators and registration officers can create/import students, edit official identity or academic data, assign houses, or record eligibility decisions.

## Database enforcement

- `user_roles` has no ordinary self-service write policy. Only an existing system administrator can grant roles through the Data API, and `granted_by` must equal the current authenticated user.
- The staff provisioning function requires an existing Supabase Auth UUID, validates role scope in PostgreSQL, records the granting administrator, and never creates credentials. It remains unavailable to anonymous and ordinary authenticated users.
- The public scoreboard is served through a fixed-search-path function that returns only published results. Student names remain withheld unless an authorized staff member has recorded explicit publication authority and an approved display name.
- Database role helpers require both an unexpired role assignment and an active staff profile, so deactivation also blocks direct Data API access.
- Administrative routes check roles on the server, and every house, student, import, and eligibility server action repeats authorization before reading input or mutating state.
- House writes are limited to administrators and sports coordinators. Deactivation preserves linked records; `ON DELETE RESTRICT` prevents destructive removal of referenced houses.
- Student writes and imports are limited to administrators and registration officers. House representatives can only read students in their scoped house and cannot update identity, academic status, house assignment, or eligibility.
- Import source files are size/type/content checked, are parsed without formula execution, and are never uploaded to an AI or external processing service. Batch metadata and per-row outcomes are protected by RLS.
- Eligibility changes run through a restricted database function and create an append-only eligibility history. Student audit snapshots deliberately omit names, student numbers, and date of birth.
- Registration mutations call a roster-lock trigger. Once an event is locked it cannot be reopened, and its entries cannot be inserted, updated, or deleted.
- Registration Data API writes are revoked. Trusted functions serialize participant-limit checks, validate eligibility/house/team invariants, and enforce the meet and event registration windows.
- Roster submission and approval are distinct states. The submitter cannot approve the same roster. Late changes require a separately recorded request and an independent administrator/coordinator decision.
- QR passes contain random opaque values; only token hashes are stored. Tokens are scoped to one approved registration, can be rotated, and cannot create duplicate active attendance. Both QR and manual paths require an assigned check-in role, an event in `check_in_open`, and explicit physical identity confirmation.
- Attendance correction does not delete evidence: an independent privileged user supplies a reason, the original attendance is voided, and a correction row is appended.
- Result writes are revoked from ordinary Data API access. Assigned judges use a trusted function that validates event state and checked-in/approved entrants. Typed checks reject impossible values, and duplicate placements require one explicit shared tie group.
- Verification, final approval, public publication and correction approval are separate functions. The submitter cannot verify or approve their own result; a correction requester cannot approve the correction.
- Scoring values live in an independently approved version. Generation locks the result, references an approved revision and active rule, and maintains exactly one active award. Recalculation voids prior awards through a trusted path.
- Standings are explicitly labelled provisional, confirmed, or final. Only administrators/coordinators can advance the declaration; final requires a completed meet, completed/cancelled events, no disputed result, and no unresolved submission. A new protest or approved correction automatically returns the declaration to provisional.
- Protest filing checks the configured deadline. Assignment rejects filer/same-house conflicts, and only an assigned conflict-free committee member may decide.
- New results must begin in `submitted`. Verification requires a results verifier, approval requires a sports coordinator, and publication is another coordinator-controlled transition.
- An approver cannot be the submitting judge. Approved payloads are immutable and published results cannot change.
- Result revision and audit tables grant no insert/update/delete capability to API roles. Security-definer trigger functions own the append path.
- Point awards accept inserts only from administrators/coordinators, only for approved/published results, only against an approved result revision and active/retired scoring version from the same meet, and only for the result's house.
- All security-definer functions use a fixed `search_path`, are owned by the migration owner, and expose execution only where RLS needs a role predicate. Trigger functions are explicitly non-executable by API roles.

## Verification

`supabase/tests/database/foundation_security_test.sql` is a transactionally isolated pgTAP suite covering:

- anonymous student-access denial and unpublished-result denial;
- authorized and unauthorized role behavior, including self-grant denial;
- student confidentiality;
- roster locking;
- submission, verification, approval, and publication separation;
- automatic revision history and ledger immutability;
- duplicate point prevention and public point visibility;
- audit-history protection.

`supabase/tests/database/admin_students_security_test.sql` adds administrator and registration-officer access, unauthorized access, case-insensitive student-number uniqueness, eligibility enforcement/history, house deactivation with linked records, mixed import outcomes, and history immutability. `tests/import-validation.test.ts` covers file metadata, mappings, missing fields, duplicates, existing records, unmatched houses, and valid/invalid row separation.

`supabase/tests/database/meet_registration_security_test.sql` adds 28 transactional assertions for unpublished-meet denial, unauthorized configuration, house scope, eligibility, duplicates, participant limits, trusted mutation functions, reviewer separation, state history, deadline/lock enforcement, independent late exceptions, token issuance, physical identity confirmation, repeat-token rejection, cross-house RLS, attendance corrections, and audit creation. `tests/meet-validation.test.ts` covers meet windows, date/year consistency, team size, and event schedule validation.

`supabase/tests/database/competition_integrity_test.sql` adds 34 transactional assertions for result-write denial, eligibility, duplicate placements, non-ranked outcomes, self-verification, independent approval, scoring-policy separation, awards, recalculation, corrections, protest conflicts, state restoration, auditing and public leakage. `tests/result-validation.test.ts` covers structured result input at the server boundary.

Run it with `supabase test db` after `supabase start`. A successful TypeScript build does not substitute for these database tests.

## Operational requirements before launch

- Run the migration and pgTAP suite against the exact PostgreSQL/Supabase version used for deployment.
- Review role assignments and remove expired or unused accounts before the meet.
- Configure MFA for privileged staff where the chosen identity provider supports it.
- Enable database backups and test restoration of results, revisions, and audit logs.
- Add monitoring for role grants, roster locks, result approvals, publications, and protest decisions.
- Confirm retention, privacy, and access rules for student date-of-birth data with the college.
- Treat downloaded error reports as confidential student records and delete them under the college's approved retention policy.
