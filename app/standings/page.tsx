import { PageHeader } from "@/components/admin/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function StandingsPage() {
  const supabase = await createClient();
  const [{ data }, { data: awards }] = await Promise.all([
    supabase
      .from("public_house_standings")
      .select(
        "sports_meet_id,standings_status,house_code,house_name,total_points,award_count,last_updated_at",
      )
      .order("total_points", { ascending: false }),
    supabase
      .from("point_awards")
      .select(
        "id,points,awarded_at,house:houses(code,name),result:results!inner(status,event:events(code,name))",
      )
      .is("voided_at", null)
      .eq("result.status", "published"),
  ]);
  const eventTotals = new Map<
    string,
    {
      eventCode: string;
      eventName: string;
      houseCode: string;
      houseName: string;
      points: number;
      awards: number;
      updatedAt: string;
    }
  >();
  for (const award of (awards ?? []) as never as {
    points: number;
    awarded_at: string;
    house: { code: string; name: string } | null;
    result: { event: { code: string; name: string } | null } | null;
  }[]) {
    if (!award.house || !award.result?.event) continue;
    const key = `${award.result.event.code}:${award.house.code}`;
    const current = eventTotals.get(key) ?? {
      eventCode: award.result.event.code,
      eventName: award.result.event.name,
      houseCode: award.house.code,
      houseName: award.house.name,
      points: 0,
      awards: 0,
      updatedAt: award.awarded_at,
    };
    current.points += Number(award.points);
    current.awards += 1;
    if (award.awarded_at > current.updatedAt)
      current.updatedAt = award.awarded_at;
    eventTotals.set(key, current);
  }
  const declaration = data?.[0]?.standings_status ?? "provisional";
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Published competition data"
        title="House standings"
        description={`Only active points backed by intentionally published results appear here. These standings are ${declaration}.`}
      />
      <p className="w-fit rounded-full border bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide">
        {declaration} standings
      </p>
      {(data ?? []).length ? (
        <div className="overflow-x-auto rounded-xl border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-4 py-3">House</th>
                <th className="px-4 py-3">Published points</th>
                <th className="px-4 py-3">Awards</th>
                <th className="px-4 py-3">Last update</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr
                  className="border-t"
                  key={`${row.sports_meet_id}-${row.house_code}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {row.house_name} ({row.house_code})
                  </td>
                  <td className="px-4 py-3">{row.total_points}</td>
                  <td className="px-4 py-3">{row.award_count}</td>
                  <td className="px-4 py-3">
                    {row.last_updated_at
                      ? new Date(row.last_updated_at).toLocaleString()
                      : "No published awards"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
          No published point awards are available. An empty table is not an
          official zero score.
        </p>
      )}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Event-level points</h2>
          <p className="text-sm text-muted">
            Each row sums active awards from published results for one house in
            one event. Corrected awards replace, rather than add to, the active
            total.
          </p>
        </div>
        {eventTotals.size ? (
          <div className="overflow-x-auto rounded-xl border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">House</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Awards</th>
                  <th className="px-4 py-3">Last update</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(eventTotals.values())
                  .sort(
                    (a, b) =>
                      a.eventName.localeCompare(b.eventName) ||
                      b.points - a.points,
                  )
                  .map((row) => (
                    <tr
                      className="border-t"
                      key={`${row.eventCode}-${row.houseCode}`}
                    >
                      <td className="px-4 py-3 font-medium">
                        {row.eventCode} · {row.eventName}
                      </td>
                      <td className="px-4 py-3">
                        {row.houseName} ({row.houseCode})
                      </td>
                      <td className="px-4 py-3">{row.points}</td>
                      <td className="px-4 py-3">{row.awards}</td>
                      <td className="px-4 py-3">
                        {new Date(row.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No event-level point awards have been published.
          </p>
        )}
      </section>
    </div>
  );
}
