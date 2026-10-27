import {
  ArrowRight,
  BadgeCheck,
  Database,
  FileClock,
  LockKeyhole,
} from "lucide-react";

const capabilities = [
  {
    icon: BadgeCheck,
    title: "Participation integrity",
    description:
      "Student identity and event eligibility are designed as separate, auditable records.",
  },
  {
    icon: FileClock,
    title: "Traceable results",
    description:
      "Submission, verification, approval, and publication remain distinct lifecycle states.",
  },
  {
    icon: Database,
    title: "Versioned scoring",
    description:
      "Point awards link to an approved result revision and an explicit scoring-rule version.",
  },
];

export function FoundationOverview() {
  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="overflow-hidden rounded-2xl border bg-surface shadow-sm">
        <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
          <div className="p-6 sm:p-9 lg:p-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-surface-muted px-3 py-1 text-xs font-semibold text-primary">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              Secure foundation in progress
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Every participant, result, and point should be accountable.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              CSMIS is being prepared for the November 2026 college sports meet.
              The current milestone provides controlled house administration, a
              private student register, staged imports, and auditable
              eligibility decisions on top of the integrity foundation.
            </p>
          </div>
          <div className="flex flex-col justify-between border-t bg-primary p-6 text-primary-foreground sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                System status
              </p>
              <p className="mt-3 text-2xl font-semibold">
                Trusted register ready
              </p>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Authentication and live operational data are not claimed as
                active until a Supabase project is configured and security tests
                pass.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm font-medium text-white/90">
              Configuration required
              <ArrowRight aria-hidden="true" className="size-4" />
            </div>
          </div>
        </div>
      </section>
      <section aria-labelledby="foundation-capabilities">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">
              Integrity by design
            </p>
            <h2
              id="foundation-capabilities"
              className="mt-1 text-2xl font-semibold tracking-tight"
            >
              Controls established at the data layer
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-muted">
            Interface visibility is not treated as authorization; sensitive
            rules are enforced by PostgreSQL constraints, triggers, and RLS.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-xl border bg-surface p-6 shadow-sm"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-surface-muted text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
