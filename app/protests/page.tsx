import { PageHeader } from "@/components/admin/page-header";
import { ProtestWorkspace } from "@/features/protests/components/protest-workspace";
import { requireRoles } from "@/lib/auth/authorization";
import { protestWorkspaceRoles } from "@/lib/auth/roles";

export default async function ProtestsPage() {
  const { supabase, roles } = await requireRoles(protestWorkspaceRoles);
  const canFile = roles.includes("house_representative");
  const canAssign =
    roles.includes("system_administrator") ||
    roles.includes("protest_committee");
  const canDecide = roles.includes("protest_committee");
  const canConfigure =
    roles.includes("system_administrator") ||
    roles.includes("sports_coordinator");
  const [
    { data: results },
    { data: protests },
    { data: roleRows },
    { data: grounds },
    { data: meets },
  ] = await Promise.all([
    supabase
      .from("results")
      .select("id,event:events(name),house:houses(code)")
      .in("status", ["approved", "final", "published"]),
    supabase
      .from("protests")
      .select(
        "id,status,grounds,grounds_code,decision,findings,result:results(event:events(name)),house:houses(code)",
      )
      .order("created_at", { ascending: false }),
    canAssign
      ? supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "protest_committee")
      : Promise.resolve({ data: [] }),
    supabase
      .from("protest_ground_categories")
      .select("id,sports_meet_id,code,name,is_active,meet:sports_meets(name)")
      .eq("is_active", true)
      .order("name"),
    canConfigure
      ? supabase
          .from("sports_meets")
          .select("id,name")
          .order("starts_on", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const reviewerIds = [...new Set((roleRows ?? []).map((row) => row.user_id))];
  const { data: profiles } = reviewerIds.length
    ? await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", reviewerIds)
        .eq("is_active", true)
    : { data: [] };
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Integrity management"
        title="Protests and decisions"
        description="Cases preserve the original result, evidence references, reviewer assignments, conflicts and reasoned decisions."
      />
      <ProtestWorkspace
        results={(results ?? []) as never}
        protests={(protests ?? []) as never}
        reviewers={profiles ?? []}
        grounds={(grounds ?? []) as never}
        meets={meets ?? []}
        canFile={canFile}
        canAssign={canAssign}
        canDecide={canDecide}
        canConfigure={canConfigure}
      />
    </div>
  );
}
