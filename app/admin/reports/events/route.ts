import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/authorization";
import { operationalSummaryReportRoles } from "@/lib/auth/roles";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const meetId = new URL(request.url).searchParams.get("meet");
    if (!meetId || !/^[0-9a-f-]{36}$/i.test(meetId))
      return NextResponse.json({ error: "Invalid meet." }, { status: 400 });
    const { supabase, userId } = await requireRoles(
      operationalSummaryReportRoles,
    );
    const [
      { data: events, error },
      { data: registrations },
      { data: results },
    ] = await Promise.all([
      supabase
        .from("events")
        .select("id,code,name,status,event_type")
        .eq("sports_meet_id", meetId)
        .order("name"),
      supabase
        .from("event_registrations")
        .select("event_id,status,event:events!inner(sports_meet_id)")
        .eq("event.sports_meet_id", meetId),
      supabase
        .from("results")
        .select("event_id,status,event:events!inner(sports_meet_id)")
        .eq("event.sports_meet_id", meetId),
    ]);
    if (error)
      return NextResponse.json(
        { error: "Report unavailable." },
        { status: 500 },
      );
    const registrationRows = registrations ?? [];
    const resultRows = results ?? [];
    await supabase.from("report_exports").insert({
      report_type: "event_summary",
      sports_meet_id: meetId,
      format: "csv",
      requested_by: userId,
      filters: {},
    });
    const csv = [
      "Event code,Event name,Type,State,Entries,Checked in,Published results",
      ...(events ?? []).map((event) =>
        [
          event.code,
          event.name,
          event.event_type,
          event.status,
          registrationRows.filter((row) => row.event_id === event.id).length,
          registrationRows.filter(
            (row) => row.event_id === event.id && row.status === "checked_in",
          ).length,
          resultRows.filter(
            (row) => row.event_id === event.id && row.status === "published",
          ).length,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="csmis-event-summary.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Authorization required." },
      { status: 403 },
    );
  }
}
