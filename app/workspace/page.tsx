import Link from "next/link";
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

export default async function WorkspacePage() {
  let context;
  try {
    context = await requireRoles(applicationRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  const visible = workspaces.filter((workspace) =>
    workspace.roles.some((role) => context.roles.includes(role)),
  );
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("display_name")
    .eq("id", context.userId)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-scoreboard px-6 py-8 text-white sm:px-10">
        <p className="section-kicker">Authorized workspace</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
          Welcome, {profile?.display_name ?? "staff member"}.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Your portal shows only the tools assigned to your active roles. The
          database independently verifies every sensitive operation.
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
      </section>
      <section>
        <div className="mb-5">
          <p className="section-kicker">Role-based access</p>
          <h2 className="section-title">Your tools</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map(({ title, description, href, icon: Icon }) => (
            <Link
              className="group rounded-2xl border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-track-orange hover:shadow-lg"
              href={href}
              key={href}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-scoreboard text-white transition group-hover:bg-track-orange group-hover:text-slate-950">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
              <p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-track-orange">
                Open workspace →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
