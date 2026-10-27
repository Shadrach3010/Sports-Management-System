import { PageHeader } from "@/components/admin/page-header";
import { requireRoles } from "@/lib/auth/authorization";
import { meetManagerRoles } from "@/lib/auth/roles";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; action?: string }>;
}) {
  const filters = await searchParams;
  const { supabase } = await requireRoles(meetManagerRoles);
  let query = supabase
    .from("audit_logs")
    .select("id,actor_id,action,table_name,record_id,occurred_at,request_id")
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (filters.table?.trim())
    query = query.eq("table_name", filters.table.trim());
  if (filters.action?.trim()) query = query.eq("action", filters.action.trim());
  const { data, error } = await query;
  if (error) throw new Error("The protected audit trail could not be loaded.");

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Append-only evidence"
        title="Audit trail"
        description="Recent security-significant changes. Payload snapshots are intentionally excluded from this screen to reduce unnecessary personal-data exposure."
      />
      <form className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-3">
        <label className="text-xs font-medium">
          Table
          <input
            className="mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm"
            defaultValue={filters.table}
            name="table"
            placeholder="results"
          />
        </label>
        <label className="text-xs font-medium">
          Action
          <input
            className="mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm"
            defaultValue={filters.action}
            name="action"
            placeholder="UPDATE"
          />
        </label>
        <button
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          type="submit"
        >
          Filter recent records
        </button>
      </form>
      {(data ?? []).length ? (
        <div className="overflow-x-auto rounded-xl border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Record</th>
                <th className="px-4 py-3">Actor</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr className="border-t" key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    {new Date(row.occurred_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.action}</td>
                  <td className="px-4 py-3">
                    {row.table_name} · {row.record_id ?? "collection"}
                  </td>
                  <td className="px-4 py-3">{row.actor_id ?? "database"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
          No audit records match the current filters.
        </p>
      )}
    </div>
  );
}
