import {
  Building2,
  CircleAlert,
  FileCheck2,
  GraduationCap,
  Medal,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { requireRoles } from "@/lib/auth/authorization";
import { adminAreaRoles } from "@/lib/auth/roles";

export default async function AdminOverviewPage() {
  const { supabase, roles } = await requireRoles(adminAreaRoles);
  const canViewImports = roles.some(
    (role) =>
      role === "system_administrator" || role === "registration_officer",
  );
  const canViewResults = roles.some((role) =>
    ["system_administrator", "sports_coordinator", "results_verifier"].includes(
      role,
    ),
  );
  const canViewProtests = roles.some((role) =>
    [
      "system_administrator",
      "sports_coordinator",
      "protest_committee",
    ].includes(role),
  );
  const [
    housesResult,
    studentsResult,
    eligibilityResult,
    importsResult,
    resultsResult,
    protestsResult,
  ] = await Promise.all([
    supabase.from("houses").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("eligibility_status", "unverified"),
    canViewImports
      ? supabase
          .from("student_import_batches")
          .select("id", { count: "exact", head: true })
          .eq("status", "staged")
      : Promise.resolve({ count: null, error: null }),
    canViewResults
      ? supabase
          .from("results")
          .select("id", { count: "exact", head: true })
          .in("status", ["submitted", "under_review", "verified"])
      : Promise.resolve({ count: null, error: null }),
    canViewProtests
      ? supabase
          .from("protests")
          .select("id", { count: "exact", head: true })
          .in("status", ["filed", "under_review"])
      : Promise.resolve({ count: null, error: null }),
  ]);

  const error =
    housesResult.error ??
    studentsResult.error ??
    eligibilityResult.error ??
    importsResult.error ??
    resultsResult.error ??
    protestsResult.error;
  if (error) throw new Error("Administrative summary could not be loaded.");

  const cards = [
    {
      label: "Houses",
      value: housesResult.count ?? 0,
      icon: Building2,
      detail: "Visible to your assigned role",
    },
    {
      label: "Students",
      value: studentsResult.count ?? 0,
      icon: GraduationCap,
      detail: "Private register records",
    },
    {
      label: "Awaiting verification",
      value: eligibilityResult.count ?? 0,
      icon: ShieldCheck,
      detail: "Eligibility remains separate from academic status",
    },
    ...(canViewImports
      ? [
          {
            label: "Imports awaiting confirmation",
            value: importsResult.count ?? 0,
            icon: FileCheck2,
            detail: "No rows are committed without confirmation",
          },
        ]
      : []),
    ...(canViewResults
      ? [
          {
            label: "Results awaiting action",
            value: resultsResult.count ?? 0,
            icon: Medal,
            detail: "Verification and final approval remain separate",
          },
        ]
      : []),
    ...(canViewProtests
      ? [
          {
            label: "Open integrity cases",
            value: protestsResult.count ?? 0,
            icon: CircleAlert,
            detail: "Filed or under independent review",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="November 2026 sports meet"
        title="Administration overview"
        description="Review registration, eligibility, result and integrity readiness. Database policies independently enforce every role boundary shown here."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, detail }) => (
          <article
            key={label}
            className="rounded-xl border bg-surface p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted">{label}</p>
              <Icon aria-hidden="true" className="size-5 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
          </article>
        ))}
      </div>
      <section className="rounded-xl border bg-surface p-6 shadow-sm">
        <h2 className="font-semibold">Current access</h2>
        <p className="mt-2 text-sm text-muted">
          Active roles verified for this request:{" "}
          {roles.map((role) => role.replaceAll("_", " ")).join(", ")}.
        </p>
      </section>
    </div>
  );
}
