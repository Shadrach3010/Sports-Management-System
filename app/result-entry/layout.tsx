import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { resultEntryRoles } from "@/lib/auth/roles";

export default async function ResultEntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRoles(resultEntryRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  return children;
}
