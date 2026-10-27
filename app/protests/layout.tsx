import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { protestWorkspaceRoles } from "@/lib/auth/roles";

export default async function ProtestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRoles(protestWorkspaceRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  return children;
}
