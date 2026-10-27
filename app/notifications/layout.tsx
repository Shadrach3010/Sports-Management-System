import { redirect } from "next/navigation";
import {
  AuthenticationRequiredError,
  requireRoles,
} from "@/lib/auth/authorization";
import { applicationRoles } from "@/lib/auth/roles";

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRoles(applicationRoles);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/login");
    redirect("/unauthorized");
  }
  return children;
}
