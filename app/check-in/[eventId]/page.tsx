import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { CheckInPanel } from "@/features/check-in/components/check-in-panel";
import { requireRoles } from "@/lib/auth/authorization";
import { checkInWorkspaceRoles } from "@/lib/auth/roles";

export default async function EventCheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) notFound();
  const { supabase } = await requireRoles(checkInWorkspaceRoles);
  const [{ data: event }, { data: registrations, error }] = await Promise.all([
    supabase
      .from("events")
      .select("id,name,code")
      .eq("id", eventId)
      .maybeSingle(),
    supabase
      .from("event_registrations")
      .select(
        "id,student:students(student_number,legal_first_name,legal_last_name),house:houses(name)",
      )
      .eq("event_id", eventId)
      .eq("status", "approved")
      .order("created_at"),
  ]);
  if (!event) notFound();
  if (error) throw new Error("Approved registrations could not be loaded.");
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Event check-in"
        title={event.name}
        description="Confirm physical identity before recording attendance. Duplicate check-ins are rejected and corrections require independent approval."
      />
      <CheckInPanel
        eventId={eventId}
        registrations={(registrations ?? []) as never}
      />
    </div>
  );
}
