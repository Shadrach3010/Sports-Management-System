# Operations runbook

## Before registration

- Apply migrations and run every pgTAP suite in non-production.
- Configure Supabase Auth providers, redirect URLs and MFA for privileged staff.
- Provision the initial administrator through the README process; review role scopes/expiry.
- Confirm houses, venues, events, schedules, limits and registration windows.
- Obtain written scoring/protest policies; enter no placeholders and obtain independent approval.
- Test backup restoration.

## Meet day

- Confirm roster locks and event-official assignments.
- Issue/rotate passes only for approved registrations; verify physical identity at every scan.
- Use manual check-in only with a reason.
- Monitor audit entries for role grants, exceptions, corrections, results, scoring and protests.
- Treat anomaly flags as human-review prompts, never automatic misconduct findings.

## Incidents

- **Compromised pass:** rotate it; the previous token hash is revoked.
- **Incorrect attendance:** an independent manager voids with a reason, then re-checks in if appropriate.
- **Incorrect published result:** request a correction; never edit directly. Approval reopens verification and voids points.
- **Scoring error:** create/approve a new official version, resolve active awards, assign and recalculate with a reason.
- **Protest evidence:** preserve it in approved college storage and record only the reference in CSMIS.

## Closeout

- Resolve disputed results before declaring final standings.
- Export required reports under the retention policy.
- Revoke temporary roles, disable unused accounts, verify backups and review audit alerts.
- Never delete audit, revision, correction, scoring-run or protest history.
