import Link from "next/link";
export const instant = false;
import { AdminShell } from "@/components/admin/admin-shell";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Building2,
  CalendarRange,
  ClipboardCheck,
  Gauge,
  Medal,
  Scale,
  ScanLine,
  ShieldCheck,
  Trophy,
  UserRoundCog,
} from "lucide-react";

import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { applicationRoles, type ApplicationRole } from "@/lib/auth/roles";

const workspaces: {
  title: string;
  description: string;
  href: string;
  icon: typeof Gauge;
  roles: ApplicationRole[];
}[] = [
  {
    title: "Administration",
    description: "Competition readiness, configuration and controlled records.",
    href: "/admin",
    icon: Gauge,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "registration_officer",
      "results_verifier",
      "protest_committee",
    ],
  },
  {
    title: "Meet setup",
    description: "Sports, venues, events, schedules and lifecycle controls.",
    href: "/admin/meets",
    icon: CalendarRange,
    roles: ["system_administrator", "sports_coordinator"],
  },
  {
    title: "Houses & students",
    description: "Trusted house and student-register administration.",
    href: "/admin/students",
    icon: Building2,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "registration_officer",
    ],
  },
  {
    title: "Athlete registration",
    description: "Create and submit authorized house rosters.",
    href: "/registration",
    icon: ClipboardCheck,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "registration_officer",
      "house_representative",
    ],
  },
  {
    title: "Event check-in",
    description: "Verify identity and record assigned-event attendance.",
    href: "/check-in",
    icon: ScanLine,
    roles: ["system_administrator", "sports_coordinator", "check_in_officer"],
  },
  {
    title: "Result entry",
    description: "Submit structured results for assigned events.",
    href: "/result-entry",
    icon: Medal,
    roles: ["event_judge"],
  },
  {
    title: "Result verification",
    description: "Independently verify, approve and publish results.",
    href: "/admin/results",
    icon: BadgeCheck,
    roles: ["system_administrator", "sports_coordinator", "results_verifier"],
  },
  {
    title: "Scoring control",
    description: "Approve scoring versions and declare standings.",
    href: "/admin/scoring",
    icon: Trophy,
    roles: ["system_administrator", "sports_coordinator"],
  },
  {
    title: "Protests & integrity",
    description: "File, assign or decide integrity cases within your role.",
    href: "/protests",
    icon: Scale,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "house_representative",
      "protest_committee",
    ],
  },
  {
    title: "Users & access",
    description: "Provision profiles and explicitly scoped role assignments.",
    href: "/admin/users",
    icon: UserRoundCog,
    roles: ["system_administrator"],
  },
  {
    title: "Notifications",
    description: "Review assignments and decisions addressed to your account.",
    href: "/notifications",
    icon: Bell,
    roles: [...applicationRoles],
  },
  {
    title: "Public scoreboard",
    description: "View intentionally published competition information.",
    href: "/",
    icon: ShieldCheck,
    roles: [...applicationRoles],
  },
];

const roleHeadings: Record<ApplicationRole, string> = {
  system_administrator: "System administration",
  sports_coordinator: "Competition coordination",
  registration_officer: "Student registration",
  house_representative: "House operations",
  check_in_officer: "Event check-in",
  event_judge: "Event judging",
  results_verifier: "Result verification",
  protest_committee: "Integrity review",
  public_viewer: "Competition viewing",
};

export default async function WorkspacePage() {
  let context;
  try {
    context = await requireRoles(applicationRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  const visible = workspaces.filter(
    (workspace) =>
      (workspace.href !== "/" || context.roles.includes("public_viewer")) &&
      workspace.roles.some((role) => context.roles.includes(role)),
  );
  const primaryRole = context.roles[0];
  const primaryAction =
    visible.find((item) => item.href !== "/notifications") ?? visible[0];
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("display_name")
    .eq("id", context.userId)
    .maybeSingle();
  const workMeasure = await (async () => {
    switch (primaryRole) {
      case "system_administrator":
      case "sports_coordinator":
        return {
          label: "Sports meets",
          result: await context.supabase
            .from("sports_meets")
            .select("id", { count: "exact", head: true }),
        };
      case "registration_officer":
        return {
          label: "Awaiting eligibility review",
          result: await context.supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("eligibility_status", "unverified"),
        };
      case "house_representative":
        return {
          label: "House registrations",
          result: await context.supabase
            .from("event_registrations")
            .select("id", { count: "exact", head: true }),
        };
      case "check_in_officer":
      case "event_judge":
        return {
          label: "Assigned events",
          result: await context.supabase
            .from("event_officials")
            .select("id", { count: "exact", head: true })
            .eq("user_id", context.userId),
        };
      case "results_verifier":
        return {
          label: "Submitted results",
          result: await context.supabase
            .from("results")
            .select("id", { count: "exact", head: true })
            .eq("status", "submitted"),
        };
      case "protest_committee":
        return {
          label: "Open protests",
          result: await context.supabase
            .from("protests")
            .select("id", { count: "exact", head: true })
            .in("status", ["filed", "under_review"]),
        };
      case "public_viewer":
        return {
          label: "Published meets",
          result: await context.supabase
            .from("sports_meets")
            .select("id", { count: "exact", head: true })
            .not("published_at", "is", null),
        };
    }
  })();

  return (
    <AdminShell roles={context.roles}>
      <div className="space-y-8">
        <section className="dashboard-banner relative overflow-hidden rounded-[2rem] px-6 py-8 text-white sm:px-10 sm:py-10">
          <div className="relative z-10">
            <p className="section-kicker">
              CSMIS / {roleHeadings[primaryRole]}
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
              {roleHeadings[primaryRole]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
              Welcome, {profile?.display_name ?? "staff member"}. Your work and
              navigation are tailored to your active role.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {context.roles.map((role) => (
                <span
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold capitalize text-slate-200"
                  key={role}
                >
                  {role.replaceAll("_", " ")}
                </span>
              ))}
            </div>
            {primaryAction ? (
              <Link
                className="mt-7 inline-flex rounded-xl bg-track-orange px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-300"
                href={primaryAction.href}
              >
                Open {primaryAction.title} →
              </Link>
            ) : null}
          </div>
        </section>
        <section
          className="grid gap-4 sm:grid-cols-3"
          aria-label="Dashboard summary"
        >
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              Your responsibility
            </p>
            <p className="mt-3 text-xl font-black">
              {roleHeadings[primaryRole]}
            </p>
            <p className="mt-1 text-sm text-muted">
              Verified from your active role assignment
            </p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              {workMeasure.label}
            </p>
            <p className="mt-3 text-3xl font-black tabular-nums">
              {workMeasure.result.error ? "—" : (workMeasure.result.count ?? 0)}
            </p>
            <p className="mt-1 text-sm text-muted">
              Visible within your assigned scope
            </p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              Start here
            </p>
            {primaryAction ? (
              <Link
                className="mt-3 inline-block text-xl font-black text-primary underline decoration-track-orange underline-offset-4 hover:text-track-orange"
                href={primaryAction.href}
              >
                {primaryAction.title} →
              </Link>
            ) : (
              <p className="mt-3 text-sm text-muted">No active task assigned</p>
            )}
            <p className="mt-1 text-sm text-muted">Your primary work area</p>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
