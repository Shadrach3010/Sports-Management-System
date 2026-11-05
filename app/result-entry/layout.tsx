import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
export const instant = false;
import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { resultEntryRoles, type ApplicationRole } from "@/lib/auth/roles";

export default async function ResultEntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let roles: ApplicationRole[];
  try {
    ({ roles } = await requireRoles(resultEntryRoles));
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  return <AdminShell roles={roles}>{children}</AdminShell>;
}
