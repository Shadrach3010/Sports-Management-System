import { SignInForm } from "@/features/auth/components/sign-in-form";
import { Activity, ShieldCheck, Trophy } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border bg-surface shadow-2xl shadow-slate-950/10 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative overflow-hidden bg-scoreboard p-7 text-white sm:p-10 lg:p-12">
        <div className="absolute -right-24 -top-24 size-64 rounded-full border-[34px] border-track-orange/20" />
        <span className="grid size-12 place-items-center rounded-xl bg-track-orange text-slate-950">
          <Trophy className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-track-orange">
          CSMIS staff portal
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
          One secure entry point. The right workspace for every role.
        </h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
          Sign in with a centrally provisioned college account. Your active
          database roles determine the tools and competition records available
          to you.
        </p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <ShieldCheck className="size-5 text-track-orange" />
            <p className="mt-3 text-sm font-bold">Database-enforced access</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <Activity className="size-5 text-track-orange" />
            <p className="mt-3 text-sm font-bold">
              Audited competition actions
            </p>
          </div>
        </div>
      </section>
      <section className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
        <p className="section-kicker">Restricted access</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">
          Staff sign in
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Enter the credentials issued through the college&apos;s configured
          Supabase Auth provider.
        </p>
        <div className="mt-7">
          <SignInForm />
        </div>
      </section>
    </div>
  );
}
