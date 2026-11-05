import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRoles } from "@/lib/auth/authorization";
import { StaffProvisioningForm } from "@/features/users/components/staff-provisioning-form";
import { StaffAccountControls } from "@/features/users/components/staff-account-controls";

export default async function UsersPage() {
  const { supabase } = await requireRoles(["system_administrator"]);
  const [
    { data: users, error: userError },
    { data: roles, error: roleError },
    { data: houses },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id,email,display_name,is_active,created_at,deleted_at")
      .is("deleted_at", null)
      .order("display_name"),
    supabase
      .from("user_roles")
      .select("id,user_id,role,house_id,event_id,granted_at,expires_at")
      .order("granted_at", { ascending: false }),
    supabase
      .from("houses")
      .select("id,code,name")
      .eq("is_active", true)
      .order("name"),
    supabase.from("events").select("id,code,name").order("name"),
  ]);
  if (userError || roleError)
    throw new Error("Users and roles could not be loaded.");
  const byUser = new Map<string, NonNullable<typeof roles>>();
  (roles ?? []).forEach((role) =>
    byUser.set(role.user_id, [...(byUser.get(role.user_id) ?? []), role]),
  );
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Administration"
        title="Users and roles"
        description="Review staff accounts and their role assignments. Role changes are intentionally not exposed as public self-service."
      />
      <StaffProvisioningForm houses={houses ?? []} events={events ?? []} />
      {users?.length ? (
        <div className="overflow-x-auto rounded-xl border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{user.display_name}</p>
                    <p className="text-xs text-muted">
                      {user.email ?? "No email"}
                    </p>
                    <StaffAccountControls
                      account={{
                        id: user.id,
                        email: user.email ?? "",
                        display_name: user.display_name,
                        is_active: user.is_active,
                      }}
                      assignment={byUser.get(user.id)?.[0] ?? null}
                      houses={houses ?? []}
                      events={events ?? []}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={user.is_active ? "success" : "neutral"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {byUser.get(user.id)?.length ? (
                        byUser
                          .get(user.id)!
                          .map((assignment) => (
                            <StatusBadge key={assignment.id}>
                              {assignment.role.replaceAll("_", " ")}
                            </StatusBadge>
                          ))
                      ) : (
                        <span className="text-muted">No assigned role</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <time dateTime={user.created_at}>
                      {new Date(user.created_at).toLocaleDateString()}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
          No staff users have been provisioned.
        </p>
      )}
    </div>
  );
}
