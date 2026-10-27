import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { RegistrationWorkspace } from "@/features/registrations/components/registration-workspace";
import { requireRoles } from "@/lib/auth/authorization";

export default async function EventRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { eventId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const { q = "" } = await searchParams;
  const { supabase, userId } = await requireRoles(["house_representative"]);
  const [{ data: assignment }, { data: event }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("house_id")
      .eq("user_id", userId)
      .eq("role", "house_representative")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("events")
      .select("id,name,event_type,roster_status,registration_status")
      .eq("id", eventId)
      .maybeSingle(),
  ]);
  if (!assignment?.house_id || !event) notFound();
  const safeQ = q
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .trim()
    .slice(0, 80);
  let studentsQuery = supabase
    .from("students")
    .select("id,student_number,legal_first_name,legal_last_name")
    .eq("house_id", assignment.house_id)
    .eq("enrollment_status", "enrolled")
    .eq("eligibility_status", "eligible")
    .order("legal_last_name")
    .limit(50);
  if (safeQ)
    studentsQuery = studentsQuery.or(
      `student_number.ilike.%${safeQ}%,legal_first_name.ilike.%${safeQ}%,legal_last_name.ilike.%${safeQ}%`,
    );
  const [{ data: students }, { data: teams }, { data: registrations }] =
    await Promise.all([
      studentsQuery,
      supabase
        .from("event_teams")
        .select("id,name,status")
        .eq("event_id", eventId)
        .eq("house_id", assignment.house_id),
      supabase
        .from("event_registrations")
        .select(
          "id,student_id,status,rejection_reason,student:students(student_number,legal_first_name,legal_last_name),team:event_teams(name)",
        )
        .eq("event_id", eventId)
        .eq("house_id", assignment.house_id)
        .order("created_at"),
    ]);
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Athlete registration"
        title={event.name}
        description="Eligibility, house membership, duplicate entries, team membership, and participant limits are rechecked by the database."
      />
      <form className="flex gap-2">
        <input
          className="min-h-10 flex-1 rounded-md border bg-white px-3 py-2 text-sm"
          name="q"
          defaultValue={safeQ}
          placeholder="Search eligible students by number or name"
        />
        <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>
      <RegistrationWorkspace
        eventId={eventId}
        houseId={assignment.house_id}
        eventType={event.event_type}
        rosterLocked={event.roster_status === "locked"}
        students={students ?? []}
        teams={teams ?? []}
        registrations={(registrations ?? []) as never}
      />
    </div>
  );
}
