import { PageHeader } from "@/components/admin/page-header";
import { ScoringManager } from "@/features/scoring/components/scoring-manager";
import { requireRoles } from "@/lib/auth/authorization";
import { scoringManagerRoles } from "@/lib/auth/roles";

export default async function ScoringPage() {
  const { supabase, userId } = await requireRoles(scoringManagerRoles);
  const [{ data: meets }, { data: rules }, { data: events }] =
    await Promise.all([
      supabase
        .from("sports_meets")
        .select("id,name,status,standings_status")
        .order("starts_on", { ascending: false }),
      supabase
        .from("scoring_rules")
        .select(
          "id,name,version,status,tie_policy,sports_meet_id,created_by,positions:scoring_rule_positions(placement,points)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select("id,name,code,sports_meet_id,scoring_rule_id")
        .order("name"),
    ]);
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Controlled configuration"
        title="Scoring policy"
        description="Version, independently approve and assign the college's official position table. No sample values are used for standings."
      />
      <ScoringManager
        meets={meets ?? []}
        rules={(rules ?? []) as never}
        events={events ?? []}
        currentUser={userId}
      />
    </div>
  );
}
