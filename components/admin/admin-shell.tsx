"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarRange,
  ClipboardCheck,
  FileBarChart,
  History,
  FileUp,
  Gauge,
  GraduationCap,
  Medal,
  Scale,
  ShieldCheck,
  Trophy,
  Users,
  Bell,
  ScanLine,
  Eye,
} from "lucide-react";

import type { ApplicationRole } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/features/auth/actions";

const items = [
  { label: "Overview", href: "/dashboard", icon: Gauge },
  {
    label: "Operations",
    href: "/admin",
    icon: ShieldCheck,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "registration_officer",
      "results_verifier",
      "protest_committee",
    ],
  },
  {
    label: "Athlete registration",
    href: "/registration",
    icon: ClipboardCheck,
    roles: ["house_representative"],
  },
  {
    label: "Event check-in",
    href: "/check-in",
    icon: ScanLine,
    roles: ["check_in_officer", "system_administrator", "sports_coordinator"],
  },
  {
    label: "Result entry",
    href: "/result-entry",
    icon: Medal,
    roles: ["event_judge"],
  },
  {
    label: "Public scoreboard",
    href: "/",
    icon: Eye,
    roles: ["public_viewer"],
  },
  { label: "Notifications", href: "/notifications", icon: Bell },
  {
    label: "Sports meets",
    href: "/admin/meets",
    icon: CalendarRange,
    roles: ["system_administrator", "sports_coordinator"],
  },
  {
    label: "Roster review",
    href: "/admin/registrations",
    icon: ClipboardCheck,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "registration_officer",
    ],
  },
  {
    label: "Results",
    href: "/admin/results",
    icon: Medal,
    roles: ["system_administrator", "sports_coordinator", "results_verifier"],
  },
  {
    label: "Scoring policy",
    href: "/admin/scoring",
    icon: Trophy,
    roles: ["system_administrator", "sports_coordinator"],
  },
  {
    label: "Integrity cases",
    href: "/protests",
    icon: Scale,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "protest_committee",
      "house_representative",
    ],
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: FileBarChart,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "registration_officer",
      "results_verifier",
    ],
  },
  {
    label: "Audit trail",
    href: "/admin/audit",
    icon: History,
    roles: ["system_administrator", "sports_coordinator"],
  },
  {
    label: "Houses",
    href: "/admin/houses",
    icon: Building2,
    roles: ["system_administrator", "sports_coordinator"],
  },
  {
    label: "Students",
    href: "/admin/students",
    icon: GraduationCap,
    roles: [
      "system_administrator",
      "sports_coordinator",
      "registration_officer",
    ],
  },
  {
    label: "Student imports",
    href: "/admin/imports",
    icon: FileUp,
    roles: ["system_administrator", "registration_officer"],
  },
  {
    label: "Users and roles",
    href: "/admin/users",
    icon: Users,
    administratorOnly: true,
  },
];

export function AdminShell({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: ApplicationRole[];
}) {
  const pathname = usePathname();
  const isAdministrator = roles.includes("system_administrator");
  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-2xl bg-scoreboard p-3 text-white shadow-xl shadow-slate-950/15 lg:sticky lg:top-24 lg:h-fit">
        <div className="flex items-center gap-3 border-b border-white/10 px-3 pb-4 pt-2">
          <span className="grid size-10 place-items-center rounded-xl bg-track-orange text-slate-950">
            <ShieldCheck aria-hidden="true" className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">CSMIS workspace</p>
            <p className="text-xs text-slate-400">
              Your active role navigation
            </p>
          </div>
        </div>
        <nav
          aria-label="Staff workspace"
          className="mt-3 flex gap-1 overflow-x-auto lg:flex-col"
        >
          {items
            .filter(
              (item) =>
                (!item.administratorOnly || isAdministrator) &&
                (!item.roles ||
                  item.roles.some((role) =>
                    roles.includes(role as ApplicationRole),
                  )),
            )
            .map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={
                  pathname === href ||
                  (href !== "/" && pathname.startsWith(`${href}/`))
                    ? "page"
                    : undefined
                }
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white",
                  pathname === href ||
                    (href !== "/" && pathname.startsWith(`${href}/`))
                    ? "bg-white/15 text-white ring-1 ring-white/20"
                    : "text-slate-300",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </Link>
            ))}
        </nav>
        <form
          action={signOutAction}
          className="mt-3 border-t border-white/10 pt-3"
        >
          <button
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-400 hover:bg-white/10 hover:text-white"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
