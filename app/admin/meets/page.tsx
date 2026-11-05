import { PageHeader } from "@/components/admin/page-header";
import {
  MeetManager,
  type MeetSummary,
} from "@/features/meets/components/meet-manager";
import { requireRoles } from "@/lib/auth/authorization";
import { meetManagerRoles } from "@/lib/auth/roles";

export default async function MeetsPage() {
  const { supabase } = await requireRoles(meetManagerRoles);
  const [{ data, error }, { data: events, error: eventError }] =
    await Promise.all([
      supabase
        .from("sports_meets")
        .select(
          "id,name,year,starts_on,ends_on,registration_opens_at,registration_closes_at,status",
        )
        .order("starts_on", { ascending: false }),
      supabase.from("events").select("sports_meet_id"),
    ]);
  if (error || eventError) throw new Error("Sports meets could not be loaded.");
  const eventCounts = new Map<string, number>();
  for (const event of events ?? [])
    eventCounts.set(
      event.sports_meet_id,
      (eventCounts.get(event.sports_meet_id) ?? 0) + 1,
    );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Competition setup"
        title="Sports meets"
        description="Add houses, categories and events while a meet is in draft. Open registration only after setup is complete."
      />
      <MeetManager
        meets={
          (data ?? []).map((meet) => ({
            ...meet,
            eventCount: eventCounts.get(meet.id) ?? 0,
          })) as MeetSummary[]
        }
      />
    </div>
  );
}
