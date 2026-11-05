# Presentation walkthrough

The configured **Test 2** meet is now a draft with three participating houses, one category and no events. An administrator or sports coordinator can add the first event at `/admin/meets/7ac8fa75-0171-400b-b73b-e9695b680baa`. Use approved meet dates, event details and scoring values; do not present demo records as official college data.

## Set up the meet

1. Sign in as a system administrator or sports coordinator and open **Sports meets → Test 2 → Configure houses and events**.
2. Review the participating houses and existing category. Fill **Create event** with its code, name, entry type, format, participant limit, schedule, rules and requirements. Event dates must fall within the meet dates.
3. Return to **Sports meets**. The event count must be at least one before **Open registration** is available.
4. Open registration for the meet, then separately open registration for each event in its configuration page. The house registration page also checks the configured registration time window.

## Role handoffs

| Role                 | Main responsibility                                                                                                                   | Next handoff                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| System administrator | Provisions staff accounts and scopes, manages houses and students, configures the meet, oversees audit and final decisions.           | Delegates the meet and staff assignments.                          |
| Sports coordinator   | Configures meets, events and schedules; reviews rosters; controls competition operations, scoring and publication.                    | Opens registration and assigns officials.                          |
| Registration officer | Imports and verifies student records, decides eligibility, reviews submitted rosters.                                                 | Hands approved rosters to meet management for lock.                |
| House representative | Registers eligible athletes from the assigned house, creates teams, submits the roster, issues approved QR passes and files protests. | Sends roster to an independent reviewer.                           |
| Check-in officer     | Scans a pass or uses a reasoned manual fallback, checks physical identity and records attendance for assigned events.                 | Hands checked-in entries to the judge.                             |
| Event judge          | Records structured results for assigned events once they are in progress.                                                             | Submits results to a different verifier.                           |
| Results verifier     | Independently verifies or rejects submitted results.                                                                                  | Sends verified results to coordinator/administrator for approval.  |
| Protest committee    | Reviews assigned, conflict-free protest cases and records decisions.                                                                  | Upheld cases return for corrected result, scoring and publication. |
| Public viewer        | Sees only deliberately published results and declared standings.                                                                      | No operational write access.                                       |

## Competition sequence

Draft meet → add houses, categories and events → open meet registration → open event registration → representative submits house roster → independent roster review → close registration and lock roster → issue QR pass → open check-in → officer confirms identity and attendance → move meet and event to in progress → judge submits result → verifier checks → coordinator/administrator approves → activate an independently approved scoring rule → award points → publish result and standings.

An event cannot be added after registration opens. An older **eventless** meet may return to draft if it has no scoring data. A meet cannot complete while an event is unfinished. A completed, cancelled or archived meet cannot change event lifecycle states.

## Production gates

- The nine demo accounts use published passwords. Replace or rotate them before real student data or public deployment.
- The custom sign-in endpoint still needs rate limiting and privileged-account MFA before internet-facing production use.
- Run the full local database suite and complete a role-by-role browser acceptance test in the deployment environment. This document is a presentation guide, not a production sign-off.
