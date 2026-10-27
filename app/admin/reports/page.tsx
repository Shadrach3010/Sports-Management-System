import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { requireRoles } from "@/lib/auth/authorization";
import { reportRoles } from "@/lib/auth/roles";

export default async function ReportsPage() {
  const { supabase, roles } = await requireRoles(reportRoles);
  const canViewOperationalSummaries = roles.some((role) =>
    [
      "system_administrator",
      "sports_coordinator",
      "registration_officer",
    ].includes(role),
  );
  const [{ data: meets }, { data: events }] = await Promise.all([
    supabase
      .from("sports_meets")
      .select("id,name")
      .order("starts_on", { ascending: false }),
    supabase.from("events").select("id,name,code").order("name"),
  ]);
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Controlled exports"
        title="Reports and print views"
        description="Exports contain only the selected operational scope. Treat downloaded files according to the college retention policy."
      />
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-surface p-5 shadow-sm">
          <h2 className="font-semibold">Published standings</h2>
          <p className="mt-2 text-sm text-muted">
            CSV totals backed only by published results and active point awards.
          </p>
          {(meets ?? []).map((meet) => (
            <div className="mt-3 grid gap-2" key={meet.id}>
              <Link
                className="block rounded-md border px-3 py-2 text-sm"
                href={`/admin/reports/standings?meet=${meet.id}`}
              >
                {meet.name} standings CSV
              </Link>
              {canViewOperationalSummaries ? (
                <>
                  <Link
                    className="block rounded-md border px-3 py-2 text-sm"
                    href={`/admin/reports/participation?meet=${meet.id}`}
                  >
                    {meet.name} participation CSV
                  </Link>
                  <Link
                    className="block rounded-md border px-3 py-2 text-sm"
                    href={`/admin/reports/events?meet=${meet.id}`}
                  >
                    {meet.name} event summary CSV
                  </Link>
                </>
              ) : null}
            </div>
          ))}
        </article>
        <article className="rounded-xl border bg-surface p-5 shadow-sm">
          <h2 className="font-semibold">Event result sheets</h2>
          <p className="mt-2 text-sm text-muted">
            Printable read-only result sheets for intentionally published event
            results.
          </p>
          {(events ?? []).map((event) => (
            <Link
              className="mt-3 block rounded-md border px-3 py-2 text-sm"
              key={event.id}
              href={`/admin/reports/event?event=${event.id}`}
            >
              {event.code} · {event.name}
            </Link>
          ))}
        </article>
      </section>
    </div>
  );
}
