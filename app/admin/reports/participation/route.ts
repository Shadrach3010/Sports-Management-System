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
    const { data, error } = await supabase
      .from("event_registrations")
      .select(
        "status,house:houses(code,name),event:events!inner(sports_meet_id)",
      )
      .eq("event.sports_meet_id", meetId);
    if (error)
      return NextResponse.json(
        { error: "Report unavailable." },
        { status: 500 },
      );
    const rows = (data ?? []) as never as {
      status: string;
      house: { code: string; name: string } | null;
    }[];
    const totals = new Map<
      string,
      {
        code: string;
        name: string;
        total: number;
        approved: number;
        checkedIn: number;
        withdrawn: number;
      }
    >();
    for (const row of rows) {
      if (!row.house) continue;
      const current = totals.get(row.house.code) ?? {
        ...row.house,
        total: 0,
        approved: 0,
        checkedIn: 0,
        withdrawn: 0,
      };
      current.total += 1;
      if (row.status === "approved" || row.status === "checked_in")
        current.approved += 1;
      if (row.status === "checked_in") current.checkedIn += 1;
      if (row.status === "withdrawn") current.withdrawn += 1;
      totals.set(row.house.code, current);
    }
    await supabase.from("report_exports").insert({
      report_type: "participation_summary",
      sports_meet_id: meetId,
      format: "csv",
      requested_by: userId,
      filters: {},
    });
    const csv = [
      "House code,House name,All entries,Approved entries,Checked in,Withdrawn",
      ...Array.from(totals.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((row) =>
          [
            row.code,
            row.name,
            row.total,
            row.approved,
            row.checkedIn,
            row.withdrawn,
          ]
            .map(csvCell)
            .join(","),
        ),
    ].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="csmis-participation-summary.csv"',
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
