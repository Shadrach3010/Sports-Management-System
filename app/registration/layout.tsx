import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { registrationWorkspaceRoles } from "@/lib/auth/roles";

export default async function RegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRoles(registrationWorkspaceRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  return children;
}
