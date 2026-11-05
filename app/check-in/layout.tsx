import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
export const instant = false;
import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { checkInWorkspaceRoles, type ApplicationRole } from "@/lib/auth/roles";

export default async function CheckInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let roles: ApplicationRole[];
  try {
    ({ roles } = await requireRoles(checkInWorkspaceRoles));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  return <AdminShell roles={roles}>{children}</AdminShell>;
}
