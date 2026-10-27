import { PageHeader } from "@/components/admin/page-header";
import { ResultReview } from "@/features/results/components/result-review";
import { requireRoles } from "@/lib/auth/authorization";
import { resultReviewRoles } from "@/lib/auth/roles";

export default async function ResultReviewPage() {
  const { supabase, roles } = await requireRoles(resultReviewRoles);
  const [{ data }, { data: corrections }] = await Promise.all([
    supabase
      .from("results")
      .select(
        "id,status,outcome,placement,time_milliseconds,distance_millimetres,height_millimetres,performance_score,tie_group,is_suspicious,event:events(name,code),house:houses(name,code)",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("result_correction_requests")
      .select("id,result_id,reason,requested_at")
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
  ]);
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Results integrity"
        title="Verification, approval and scoring"
        description="Verification, final approval, publication and point generation remain separate controlled decisions."
      />
      <ResultReview
        results={(data ?? []) as never}
        corrections={corrections ?? []}
        canVerify={
          roles.includes("results_verifier") ||
          roles.includes("system_administrator")
        }
        canFinalize={
          roles.includes("sports_coordinator") ||
          roles.includes("system_administrator")
        }
      />
    </div>
  );
}
