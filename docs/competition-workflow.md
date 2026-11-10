# Competition workflow

## State sequence

1. **Prepare:** administrators/coordinators create the draft meet, participating houses, categories, venues, events and schedules. At least one event is required before opening registration. Venue changes are conflict-checked and revisioned.
2. **Register:** the meet and each event explicitly open. Representatives register only enrolled, eligible own-house students. Team membership uses stable team records.
3. **Review and lock:** a different authorized reviewer decides each submitted roster. After the deadline, the event roster is irreversibly locked. Late additions require a reasoned request and independent coordinator decision.
4. **Check in:** after roster lock, an opaque token may be issued. An assigned officer confirms physical identity. Manual fallback requires a reason; corrections are independently voided, not deleted.
   The house representative downloads the pass from the approved registration and hands it to the athlete after identity confirmation; CSMIS does not deliver it automatically.
5. **Record:** during/after competition, the assigned judge records a checked-in individual or approved team. Outcomes cover ranked, DNS, DNF, disqualified, withdrawn and abandoned entries.
   Assigned scheduled events remain visible to the judge, with result entry disabled until the event is in progress or completed.
6. **Verify:** a different verifier verifies/rejects. A separate coordinator/administrator approves, optionally marks final, and deliberately publishes.
7. **Score:** only an independently activated official rule assigned to the event can produce an award. Recalculation voids the old award and references the current approved revision.
8. **Protest:** representatives file before the configured deadline. Reviewers must be conflict-free. Upheld cases stay disputed for correction; dismissed cases restore their prior state.
9. **Publish/report:** public pages contain published results/current awards only. House and event totals begin as provisional, advance through an audited confirmation, and become final only for a completed meet with no disputed result. Staff exports are authorization-checked and logged.

## Who does what

| Stage                            | Responsible role                                                                          | Required handoff                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Staff access and houses          | System administrator; sports coordinator manages houses                                   | Accounts receive explicit roles and scopes.                                                                                    |
| Student register and eligibility | Registration officer or system administrator                                              | Academic status, eligibility and public-name authority are separate decisions.                                                 |
| Meet and event setup             | Sports coordinator or system administrator                                                | Create categories and events while the meet is `draft`. Then open the meet and each event separately for athlete registration. |
| Draft athlete and team entries   | House representative for the assigned house                                               | Only enrolled, eligible students from participating houses can be entered.                                                     |
| Roster submission                | House representative                                                                      | A submitted roster awaits independent review.                                                                                  |
| Roster review and lock           | Registration officer, sports coordinator or system administrator                          | The submitter cannot approve; roster lock follows review and registration close.                                               |
| Check-in                         | Assigned check-in officer                                                                 | Approved entry, locked roster, pass or reasoned manual fallback, and physical identity confirmation.                           |
| Results                          | Assigned event judge, results verifier, then coordinator/administrator                    | Submission, verification, approval and publication are distinct.                                                               |
| Scoring                          | Scoring managers                                                                          | An independently activated rule version assigned to the event produces traceable awards.                                       |
| Protests and final standings     | House representative files; conflict-free committee decides; authorized managers finalize | Corrections, scoring and publication follow the decision.                                                                      |

The house registration page displays the **effective** status. Opening the meet does not open its events. An event can also be outside the meet's registration window or have a locked roster. If a card says **Event closed**, a meet manager opens that event at `/admin/meets/[id]`. If it says **Meet closed** or **Outside window**, the manager reviews the meet status or dates. The database repeats these checks when an athlete is added.

If an older meet is already `registration_open` with zero events, its manager can return it to `draft` from `/admin/meets` provided it has no scoring data. Then add the event and reopen registration. A meet with event or scoring records cannot use this recovery path.

An accidentally closed meet with linked events is not deleted or reopened through the ordinary workflow. Closing registration freezes the register for review; archived meets preserve the competition and audit trail. To rehearse a new flow, create a distinct draft meet even in the same year. Meet names are unique within a year, and registration must close before the meet starts. If an operational meet needs an exceptional reversal, investigate its rosters, attendance, results, and audit history before authorizing a separate, audited recovery migration. Do not update lifecycle status directly in the SQL editor.

## Separation of duties

- Roster submitter ≠ roster reviewer.
- Result submitter ≠ result verifier ≠ final approver.
- Scoring-version creator ≠ scoring-version approver.
- Correction requester ≠ correction approver.
- Protest filer/same-house representative ≠ protest decision-maker.

## Acceptance path

Create synthetic staff/student records, verify eligibility, configure a meet/event, register/approve/lock/check in, enter/verify/approve a result, activate/assign a test-only scoring version, score/publish, file/dismiss a protest, and confirm the result/award reappears publicly. Never use real student data for acceptance testing.
