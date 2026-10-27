export const applicationRoles = [
  "system_administrator",
  "sports_coordinator",
  "registration_officer",
  "house_representative",
  "check_in_officer",
  "event_judge",
  "results_verifier",
  "protest_committee",
  "public_viewer",
] as const;

export type ApplicationRole = (typeof applicationRoles)[number];

export const adminAreaRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
  "registration_officer",
  "results_verifier",
  "protest_committee",
];

export const houseManagerRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
];

export const studentManagerRoles: ApplicationRole[] = [
  "system_administrator",
  "registration_officer",
];

export const meetManagerRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
];

export const registrationWorkspaceRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
  "registration_officer",
  "house_representative",
];

export const registrationReviewerRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
  "registration_officer",
];

export const checkInWorkspaceRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
  "check_in_officer",
];

export const resultEntryRoles: ApplicationRole[] = ["event_judge"];

export const resultReviewRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
  "results_verifier",
];

export const scoringManagerRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
];

export const protestWorkspaceRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
  "house_representative",
  "protest_committee",
];

export const reportRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
  "registration_officer",
  "results_verifier",
];

export const operationalSummaryReportRoles: ApplicationRole[] = [
  "system_administrator",
  "sports_coordinator",
  "registration_officer",
];
