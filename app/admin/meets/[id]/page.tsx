import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { MeetConfiguration } from "@/features/meets/components/meet-configuration";
import { MeetSettings } from "@/features/meets/components/meet-settings";
import { ScheduleManager } from "@/features/meets/components/schedule-manager";
import { requireRoles } from "@/lib/auth/authorization";
import { meetManagerRoles } from "@/lib/auth/roles";

export default async function MeetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireRoles(meetManagerRoles);
  const [
    { data: meet },
    { data: houses },
    { data: participation },
    { data: categories },
    { data: events },
    { data: venues },
  ] = await Promise.all([
    supabase
      .from("sports_meets")
      .select(
        "id,name,year,status,starts_on,ends_on,registration_opens_at,registration_closes_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("houses")
      .select("id,name,code")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("meet_houses")
      .select("house_id,is_active")
      .eq("sports_meet_id", id),
    supabase
      .from("sport_categories")
      .select("id,name,code")
      .eq("sports_meet_id", id)
      .order("name"),
    supabase
      .from("events")
      .select(
        "id,code,name,event_type,format_code,registration_status,roster_status,status,starts_at,ends_at,protest_deadline_at,maximum_participants_per_house",
      )
      .eq("sports_meet_id", id)
      .order("starts_at"),
    supabase
      .from("venues")
      .select("id,code,name")
      .eq("sports_meet_id", id)
      .eq("is_active", true)
      .order("name"),
  ]);
  if (!meet) notFound();
  const active = new Set(
    (participation ?? [])
      .filter((item) => item.is_active)
      .map((item) => item.house_id),
  );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Meet configuration"
        title={meet.name}
        description={`${meet.starts_on} to ${meet.ends_on} · ${meet.status.replaceAll("_", " ")}`}
      />
      <MeetSettings meet={meet} />
      <MeetConfiguration
        meetId={id}
        meetStatus={meet.status}
        houses={(houses ?? []).map((house) => ({
          ...house,
          participating: active.has(house.id),
        }))}
        categories={categories ?? []}
        events={events ?? []}
      />
      <ScheduleManager
        meetId={id}
        venues={venues ?? []}
        events={(events ?? []) as never}
      />
    </div>
  );
}
