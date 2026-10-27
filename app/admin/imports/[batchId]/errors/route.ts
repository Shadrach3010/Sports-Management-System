import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  requireRoles,
} from "@/lib/auth/authorization";
import { studentManagerRoles } from "@/lib/auth/roles";

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ batchId: string }> },
) {
  try {
    const { batchId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(batchId))
      return new Response("Invalid import batch.", { status: 400 });
    const { supabase } = await requireRoles(studentManagerRoles);
    const [{ data: batch }, { data: rows, error }] = await Promise.all([
      supabase
        .from("student_import_batches")
        .select("file_name")
        .eq("id", batchId)
        .maybeSingle(),
      supabase
        .from("student_import_rows")
        .select(
          "row_number,student_number,legal_first_name,legal_last_name,source_house,validation_status,issues",
        )
        .eq("batch_id", batchId)
        .neq("validation_status", "imported")
        .order("row_number"),
    ]);
    if (error || !batch)
      return new Response("Import batch not found.", { status: 404 });
    const header = [
      "row_number",
      "student_number",
      "first_name",
      "last_name",
      "source_house",
      "status",
      "issues",
    ];
    const lines = [
      header,
      ...(rows ?? []).map((row) => [
        row.row_number,
        row.student_number,
        row.legal_first_name,
        row.legal_last_name,
        row.source_house,
        row.validation_status,
        Array.isArray(row.issues) ? row.issues.join("|") : "validation_error",
      ]),
    ].map((row) => row.map(csvCell).join(","));
    const safeName = batch.file_name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-errors.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError)
      return new Response("Authentication required.", { status: 401 });
    if (error instanceof AuthorizationDeniedError)
      return new Response("Forbidden.", { status: 403 });
    return new Response("The report could not be generated.", { status: 500 });
  }
}
