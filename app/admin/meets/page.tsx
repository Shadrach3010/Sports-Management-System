import { PageHeader } from "@/components/admin/page-header";
import {
  MeetManager,
  type MeetSummary,
} from "@/features/meets/components/meet-manager";
import { requireRoles } from "@/lib/auth/authorization";
import { meetManagerRoles } from "@/lib/auth/roles";

export default async function MeetsPage() {
  const { supabase } = await requireRoles(meetManagerRoles);
  const { data, error } = await supabase
    .from("sports_meets")
    .select(
      "id,name,year,starts_on,ends_on,registration_opens_at,registration_closes_at,status",
    )
    .order("starts_on", { ascending: false });
  if (error) throw new Error("Sports meets could not be loaded.");
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Competition setup"
        title="Sports meets"
        description="Configure meet dates and progress status through controlled transitions."
      />
      <MeetManager meets={(data ?? []) as MeetSummary[]} />
    </div>
  );
}
