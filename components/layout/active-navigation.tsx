"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";

const navigation = [
  { label: "Scoreboard", href: "/" },
  { label: "Results", href: "/public/results" },
  { label: "Standings", href: "/standings" },
];

export function ActiveNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={mobile ? "Primary mobile" : "Primary"}
      className={
        mobile
          ? "mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden"
          : "ml-auto hidden items-center gap-1 md:flex"
      }
    >
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname === item.href ? "page" : undefined}
          className={`${mobile ? "shrink-0 rounded-md" : "rounded-lg"} px-3 py-2 text-sm font-bold transition-colors hover:bg-white/10 hover:text-white ${pathname === item.href ? "bg-white/15 text-white ring-1 ring-white/20" : "text-slate-300"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function StaffPortalLink() {
  const pathname = usePathname();
  const staffPath = [
    "/dashboard",
    "/workspace",
    "/admin",
    "/registration",
    "/check-in",
    "/result-entry",
    "/protests",
    "/notifications",
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));
  return (
    <Link
      href="/dashboard"
      aria-current={staffPath ? "page" : undefined}
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-slate-100 ${staffPath ? "bg-orange-100 text-slate-950 ring-2 ring-track-orange" : "bg-white text-slate-950"}`}
    >
      <LockKeyhole className="size-4" aria-hidden="true" /> Staff portal
    </Link>
  );
}
