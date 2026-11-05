import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays, ShieldCheck, Trophy } from "lucide-react";

import {
  ActiveNavigation,
  StaffPortalLink,
} from "@/components/layout/active-navigation";

export function ApplicationShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-scoreboard text-white shadow-lg shadow-slate-950/10">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-track-orange text-slate-950 shadow-lg shadow-orange-950/20">
              <Trophy aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black tracking-[0.12em] text-white">
                CSMIS
              </span>
              <span className="hidden truncate text-[0.68rem] font-medium text-slate-400 sm:block">
                Competition integrity centre
              </span>
            </span>
          </Link>
          <Suspense
            fallback={
              <nav aria-label="Primary" className="ml-auto hidden md:flex" />
            }
          >
            <ActiveNavigation />
          </Suspense>
          <div className="ml-auto flex items-center gap-2 md:ml-4">
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 xl:flex">
              <CalendarDays
                aria-hidden="true"
                className="size-3.5 text-track-orange"
              />
              NOV 2026
            </span>
            <Suspense
              fallback={
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-950"
                >
                  Staff portal
                </Link>
              }
            >
              <StaffPortalLink />
            </Suspense>
          </div>
        </div>
        <Suspense fallback={null}>
          <ActiveNavigation mobile />
        </Suspense>
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10"
      >
        {children}
      </main>
      <footer className="mt-10 border-t border-white/10 bg-scoreboard text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck
              className="size-4 text-track-orange"
              aria-hidden="true"
            />
            Verified participation · traceable results · accountable scoring
          </p>
          <p>Neutral CSMIS identity pending official college brand assets.</p>
        </div>
      </footer>
    </div>
  );
}
