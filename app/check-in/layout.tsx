import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { checkInWorkspaceRoles } from "@/lib/auth/roles";

export default async function CheckInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRoles(checkInWorkspaceRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  return children;
}
