import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRoles } from "@/lib/auth/authorization";

export default async function RegistrationPage() {
  const { supabase, userId } = await requireRoles(["house_representative"]);
  const { data: assignment } = await supabase
    .from("user_roles")
    .select("house_id,houses(name,code)")
    .eq("user_id", userId)
    .eq("role", "house_representative")
    .limit(1)
    .maybeSingle();
  if (!assignment?.house_id) throw new Error("A house assignment is required.");
  const { data: participation } = await supabase
    .from("meet_houses")
    .select("sports_meet_id")
    .eq("house_id", assignment.house_id)
    .eq("is_active", true);
  const meetIds = (participation ?? []).map((item) => item.sports_meet_id);
  const { data, error } = meetIds.length
    ? await supabase
        .from("events")
        .select(
          "id,name,code,event_type,format_code,registration_status,roster_status,starts_at,sports_meets(name,status)",
        )
        .in("sports_meet_id", meetIds)
        .order("starts_at")
    : { data: [], error: null };
  if (error) throw new Error("Registration events could not be loaded.");
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="House representative"
        title="Athlete registration"
        description="Register only verified students from your assigned house and submit complete rosters for independent review."
      />
      {data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((event) => (
            <article
              className="rounded-xl border bg-surface p-5 shadow-sm"
              key={event.id}
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted">{event.code}</p>
                  <h2 className="font-semibold">{event.name}</h2>
                  <p className="mt-1 text-sm capitalize text-muted">
                    {event.format_code?.replaceAll("_", " ")} ·{" "}
                    {event.event_type}
                  </p>
                </div>
                <StatusBadge
                  tone={
                    event.registration_status === "open" ? "success" : "neutral"
                  }
                >
                  {event.roster_status === "locked"
                    ? "locked"
                    : event.registration_status}
                </StatusBadge>
              </div>
              <Link
                className="mt-4 inline-block text-sm font-semibold text-primary underline"
                href={`/registration/${event.id}`}
              >
                Manage roster
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border bg-surface p-5 text-sm text-muted">
          No events are currently available to your house.
        </p>
      )}
    </div>
  );
}
