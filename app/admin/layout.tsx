import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { adminAreaRoles, type ApplicationRole } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let roles: ApplicationRole[];
  try {
    ({ roles } = await requireRoles(adminAreaRoles));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  return <AdminShell roles={roles}>{children}</AdminShell>;
}
