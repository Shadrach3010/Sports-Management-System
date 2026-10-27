# Scoring policy decisions

CSMIS contains no official points table. The college must approve and document:

- points per placement and whether individual/team events share a table;
- tie treatment: equal points, average shared places, or manual decision;
- treatment of DNS, DNF, disqualification, withdrawal and abandoned events;
- participation points, penalties or deductions, if any;
- when standings become provisional, confirmed and final;
- who may approve a version after competition activity starts.

## Implemented controls

Position values are normalized in `scoring_rule_positions`. A rule begins as draft, is submitted, and must be activated by a different administrator/coordinator. Events reference the exact active version. Non-ranked outcomes receive no automated award. A manual tie policy blocks automatic scoring pending an authorized decision.

Recalculation never edits old points: it voids the active award with actor/time/reason, inserts a replacement and records a scoring run. Correcting a result voids its award and restarts verification. A filed protest or approved correction returns any confirmed/final declaration to provisional; a fresh authorized declaration is required after resolution. Final declaration additionally requires a completed meet, completed/cancelled events, no dispute, and no unresolved result submission. Standings are explainable as the sum of current awards backed by published results.
