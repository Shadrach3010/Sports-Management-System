import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { requireRoles } from "@/lib/auth/authorization";
import { reportRoles } from "@/lib/auth/roles";

export default async function EventReportPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event } = await searchParams;
  if (!event || !/^[0-9a-f-]{36}$/i.test(event)) notFound();
  const { supabase, userId } = await requireRoles(reportRoles);
  const [{ data: eventRow }, { data: results }] = await Promise.all([
    supabase
      .from("events")
      .select("id,name,code,starts_at,venue:venues(name)")
      .eq("id", event)
      .maybeSingle(),
    supabase
      .from("results")
      .select(
        "id,outcome,placement,time_milliseconds,distance_millimetres,height_millimetres,performance_score,house:houses(name,code)",
      )
      .eq("event_id", event)
      .eq("status", "published")
      .order("placement"),
  ]);
  if (!eventRow) notFound();
  await supabase.from("report_exports").insert({
    report_type: "event_results",
    event_id: event,
    format: "print",
    requested_by: userId,
    filters: { published_only: true },
  });
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Published result sheet"
        title={`${eventRow.code} · ${eventRow.name}`}
        description="Print using the browser print command. Disputed and unpublished results are excluded."
      />
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Place</th>
              <th className="px-4 py-3">House</th>
              <th className="px-4 py-3">Outcome</th>
              <th className="px-4 py-3">Performance</th>
            </tr>
          </thead>
          <tbody>
            {(
              (results ?? []) as never as {
                id: string;
                placement: number | null;
                outcome: string;
                time_milliseconds: number | null;
                distance_millimetres: number | null;
                height_millimetres: number | null;
                performance_score: number | null;
                house: { name: string; code: string } | null;
              }[]
            ).map((row) => (
              <tr className="border-t" key={row.id}>
                <td className="px-4 py-3">{row.placement ?? "—"}</td>
                <td className="px-4 py-3">
                  {row.house?.name} ({row.house?.code})
                </td>
                <td className="px-4 py-3">
                  {row.outcome.replaceAll("_", " ")}
                </td>
                <td className="px-4 py-3">
                  {row.time_milliseconds ??
                    row.distance_millimetres ??
                    row.height_millimetres ??
                    row.performance_score ??
                    "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
