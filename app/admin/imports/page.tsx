import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ImportWorkflow } from "@/features/imports/components/import-workflow";
import { requireRoles } from "@/lib/auth/authorization";
import { studentManagerRoles } from "@/lib/auth/roles";

export default async function ImportsPage() {
  const { supabase } = await requireRoles(studentManagerRoles);
  const { data, error } = await supabase
    .from("student_import_batches")
    .select(
      "id,file_name,status,total_rows,valid_rows,invalid_rows,imported_rows,rejected_rows,created_at,completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error("Import history could not be loaded.");
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Student register"
        title="Student imports"
        description="Preview, map, validate, and explicitly confirm CSV or XLSX data. Imported students always begin with unverified competition eligibility."
      />
      <ImportWorkflow />
      <section>
        <h2 className="mb-3 font-semibold">Recent import batches</h2>
        {data?.length ? (
          <div className="overflow-x-auto rounded-xl border bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Report</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-4 py-3 font-medium">{batch.file_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={
                          batch.status === "completed" ? "success" : "neutral"
                        }
                      >
                        {batch.status}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      {batch.total_rows} ({batch.valid_rows} valid)
                    </td>
                    <td className="px-4 py-3">
                      {batch.imported_rows} imported / {batch.rejected_rows}{" "}
                      rejected
                    </td>
                    <td className="px-4 py-3">
                      <time dateTime={batch.created_at}>
                        {new Date(batch.created_at).toLocaleDateString()}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        className="font-medium text-primary underline"
                        href={`/admin/imports/${batch.id}/errors`}
                      >
                        Errors CSV
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No imports have been staged.
          </p>
        )}
      </section>
    </div>
  );
}
