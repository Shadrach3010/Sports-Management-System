import { PageHeader } from "@/components/admin/page-header";
import { requireRoles } from "@/lib/auth/authorization";
import { applicationRoles } from "@/lib/auth/roles";

export default async function NotificationsPage() {
  const { supabase } = await requireRoles(applicationRoles);
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id,notification_type,title,body,related_table,related_id,read_at,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Notifications could not be loaded.");
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Staff account"
        title="Notifications"
        description="Assignment and decision notices addressed to the signed-in account. Notifications never replace the underlying protected case record."
      />
      {(data ?? []).length ? (
        <div className="space-y-3">
          {(data ?? []).map((item) => (
            <article
              className="rounded-xl border bg-surface p-5 shadow-sm"
              key={item.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-semibold">{item.title}</h2>
                <time className="text-xs text-muted" dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleString()}
                </time>
              </div>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
              <p className="mt-3 text-xs text-muted">
                {item.notification_type.replaceAll("_", " ")}
                {item.related_table ? ` · ${item.related_table}` : ""}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
          No notifications have been issued to this account.
        </p>
      )}
    </div>
  );
}
