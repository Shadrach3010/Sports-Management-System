import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { ResultEntryForm } from "@/features/results/components/result-entry-form";
import { requireRoles } from "@/lib/auth/authorization";
import { resultEntryRoles } from "@/lib/auth/roles";

export default async function ResultEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const { event: selectedEvent } = await searchParams;
  const { supabase } = await requireRoles(resultEntryRoles);
  const { data: events } = await supabase
    .from("events")
    .select("id,name,code,status,event_type")
    .in("status", ["in_progress", "completed"])
    .order("name");
  const event =
    (events ?? []).find((item) => item.id === selectedEvent) ?? null;
  let entrants: { id: string; label: string; kind: "registration" | "team" }[] =
    [];
  if (event?.event_type === "individual") {
    const { data } = await supabase
      .from("event_registrations")
      .select(
        "id,student:students(student_number,legal_first_name,legal_last_name),house:houses(code)",
      )
      .eq("event_id", event.id)
      .eq("status", "checked_in");
    entrants = (
      (data ?? []) as never as {
        id: string;
        student: {
          student_number: string;
          legal_first_name: string;
          legal_last_name: string;
        } | null;
        house: { code: string } | null;
      }[]
    ).map((row) => ({
      id: row.id,
      kind: "registration",
      label: `${row.student?.student_number} · ${row.student?.legal_first_name} ${row.student?.legal_last_name} · ${row.house?.code}`,
    }));
  } else if (event) {
    const { data } = await supabase
      .from("event_teams")
      .select("id,name,house:houses(code)")
      .eq("event_id", event.id)
      .eq("status", "approved");
    entrants = (
      (data ?? []) as never as {
        id: string;
        name: string;
        house: { code: string } | null;
      }[]
    ).map((row) => ({
      id: row.id,
      kind: "team",
      label: `${row.name} · ${row.house?.code}`,
    }));
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Event judge"
        title="Result entry"
        description="Record structured performances and submit them for independent verification. Unusual values may be flagged for review without alleging misconduct."
      />
      <nav className="flex flex-wrap gap-2">
        {(events ?? []).map((item) => (
          <Link
            className="rounded-md border bg-surface px-3 py-2 text-sm"
            href={`/result-entry?event=${item.id}`}
            key={item.id}
          >
            {item.code} · {item.name}
          </Link>
        ))}
      </nav>
      {event ? (
        entrants.length ? (
          <ResultEntryForm eventId={event.id} entrants={entrants} />
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No checked-in participant or approved team is ready for this event.
          </p>
        )
      ) : (
        <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
          Select an assigned event that is in progress or completed.
        </p>
      )}
    </div>
  );
}
