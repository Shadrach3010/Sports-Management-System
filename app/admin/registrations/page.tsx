import { PageHeader } from "@/components/admin/page-header";
import { RosterReview } from "@/features/registrations/components/roster-review";
import { requireRoles } from "@/lib/auth/authorization";
import { registrationReviewerRoles } from "@/lib/auth/roles";

export default async function RegistrationReviewPage() {
  const { supabase, roles: authorizedRoles } = await requireRoles(
    registrationReviewerRoles,
  );
  const canManageControls = authorizedRoles.some((role) =>
    ["system_administrator", "sports_coordinator"].includes(role),
  );
  const [
    { data: submissions },
    { data: lateRequests },
    { data: events },
    { data: profiles },
    { data: roleRows },
    { data: attendance },
  ] = await Promise.all([
    supabase
      .from("event_roster_submissions")
      .select(
        "id,status,submitted_at,rejection_reason,event:events(name,code),house:houses(name,code)",
      )
      .order("submitted_at", { ascending: false }),
    supabase
      .from("roster_change_requests")
      .select(
        "id,status,reason,requested_at,event:events(name),house:houses(name),student:students(student_number,legal_first_name,legal_last_name)",
      )
      .order("requested_at", { ascending: false }),
    supabase.from("events").select("id,name,code,roster_status").order("name"),
    supabase
      .from("profiles")
      .select("id,display_name")
      .eq("is_active", true)
      .order("display_name"),
    supabase
      .from("user_roles")
      .select("user_id,role")
      .in("role", ["check_in_officer", "event_judge"]),
    supabase
      .from("attendance")
      .select(
        "id,method,checked_in_at,event:events(name),registration:event_registrations(student:students(student_number,legal_first_name,legal_last_name))",
      )
      .is("voided_at", null)
      .order("checked_in_at", { ascending: false }),
  ]);
  const roles = new Map<string, string[]>();
  (roleRows ?? []).forEach((row) =>
    roles.set(row.user_id, [...(roles.get(row.user_id) ?? []), row.role]),
  );
  const officials = (profiles ?? [])
    .filter((profile) => roles.has(profile.id))
    .map((profile) => ({ ...profile, roles: roles.get(profile.id) ?? [] }));
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Registration control"
        title="Roster review and locking"
        description="Review house submissions independently, lock completed rosters, authorize documented exceptions, and scope event officials."
      />
      <RosterReview
        submissions={(submissions ?? []) as never}
        lateRequests={(lateRequests ?? []) as never}
        events={events ?? []}
        officials={officials}
        attendance={(attendance ?? []) as never}
        canManageOfficials={canManageControls}
        canCorrectAttendance={canManageControls}
      />
    </div>
  );
}
