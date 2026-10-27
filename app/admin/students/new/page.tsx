import { PageHeader } from "@/components/admin/page-header";
import { StudentForm } from "@/features/students/components/student-form";
import { requireRoles } from "@/lib/auth/authorization";
import { studentManagerRoles } from "@/lib/auth/roles";

export default async function NewStudentPage() {
  const { supabase } = await requireRoles(studentManagerRoles);
  const { data, error } = await supabase
    .from("houses")
    .select("id,name,code")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error("Active houses could not be loaded.");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Student register"
        title="Add student"
        description="Create an official record. Eligibility remains unverified until an authorized decision is recorded."
      />
      <StudentForm houses={data ?? []} />
    </div>
  );
}
