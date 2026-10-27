import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { requireRoles } from "@/lib/auth/authorization";
import { checkInWorkspaceRoles } from "@/lib/auth/roles";

export default async function CheckInPage() {
  const { supabase, userId, roles } = await requireRoles(checkInWorkspaceRoles);
  const privileged = roles.some(
    (role) => role === "system_administrator" || role === "sports_coordinator",
  );
  let query = supabase
    .from("events")
    .select("id,name,code,starts_at,status")
    .order("starts_at");
  if (!privileged) {
    const { data: assignments } = await supabase
      .from("event_officials")
      .select("event_id")
      .eq("user_id", userId)
      .eq("official_role", "check_in_officer");
    query = query.in(
      "id",
      (assignments ?? []).map((item) => item.event_id),
    );
  }
  const { data, error } = await query;
  if (error) throw new Error("Assigned events could not be loaded.");
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Identity control"
        title="Event check-in"
        description="Only assigned officers can verify approved entries. A QR pass is an identifier, not proof of eligibility or identity."
      />
      {data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((event) => (
            <article
              className="rounded-xl border bg-surface p-5 shadow-sm"
              key={event.id}
            >
              <p className="font-mono text-xs text-muted">{event.code}</p>
              <h2 className="font-semibold">{event.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {event.starts_at
                  ? new Date(event.starts_at).toLocaleString()
                  : "Schedule pending"}
              </p>
              <Link
                className="mt-4 inline-block text-sm font-semibold text-primary underline"
                href={`/check-in/${event.id}`}
              >
                Open check-in
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
          No events are assigned for check-in.
        </p>
      )}
    </div>
  );
}
