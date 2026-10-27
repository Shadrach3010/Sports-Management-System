import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/authorization";
import { reportRoles } from "@/lib/auth/roles";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  try {
    const meetId = new URL(request.url).searchParams.get("meet");
    if (!meetId || !/^[0-9a-f-]{36}$/i.test(meetId))
      return NextResponse.json({ error: "Invalid meet." }, { status: 400 });
    const { supabase, userId } = await requireRoles(reportRoles);
    const { data, error } = await supabase
      .from("public_house_standings")
      .select("house_code,house_name,total_points,award_count,last_updated_at")
      .eq("sports_meet_id", meetId)
      .order("total_points", { ascending: false });
    if (error)
      return NextResponse.json(
        { error: "Report unavailable." },
        { status: 500 },
      );
    await supabase.from("report_exports").insert({
      report_type: "house_standings",
      sports_meet_id: meetId,
      format: "csv",
      requested_by: userId,
      filters: {},
    });
    const csv = [
      "House code,House name,Published points,Award count,Last updated",
      ...(data ?? []).map((row) =>
        [
          row.house_code,
          row.house_name,
          row.total_points,
          row.award_count,
          row.last_updated_at,
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="csmis-published-standings.csv"',
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
