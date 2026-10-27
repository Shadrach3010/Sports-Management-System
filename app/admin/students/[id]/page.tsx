import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EligibilityForm } from "@/features/students/components/eligibility-form";
import { StudentForm } from "@/features/students/components/student-form";
import { PublicResultIdentityForm } from "@/features/students/components/public-result-identity-form";
import { requireRoles } from "@/lib/auth/authorization";
import { adminAreaRoles, studentManagerRoles } from "@/lib/auth/roles";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StudentDetail = {
  id: string;
  student_number: string;
  legal_first_name: string;
  legal_last_name: string;
  other_names: string | null;
  enrollment_status: string;
  eligibility_status: string;
  eligibility_reason: string | null;
  eligibility_verified_at: string | null;
  public_results_name: string | null;
  public_results_consent_at: string | null;
  house_id: string;
  house: { name: string; code: string } | null;
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { supabase, roles } = await requireRoles(adminAreaRoles);
  const [{ data, error }, { data: houses }, { data: history }] =
    await Promise.all([
      supabase
        .from("students")
        .select(
          "id,student_number,legal_first_name,legal_last_name,other_names,enrollment_status,eligibility_status,eligibility_reason,eligibility_verified_at,public_results_name,public_results_consent_at,house_id,house:houses(name,code)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("houses")
        .select("id,name,code")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("student_eligibility_history")
        .select("id,previous_status,new_status,reason,changed_at")
        .eq("student_id", id)
        .order("changed_at", { ascending: false })
        .limit(20),
    ]);
  if (error) throw new Error("The student record could not be loaded.");
  if (!data) notFound();
  const student = data as unknown as StudentDetail;
  const canManage = studentManagerRoles.some((role) => roles.includes(role));
  const houseOptions = houses ?? [];
  if (
    !houseOptions.some((house) => house.id === student.house_id) &&
    student.house
  )
    houseOptions.push({
      id: student.house_id,
      name: student.house.name,
      code: student.house.code,
    });

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Student register"
        title={`${student.legal_first_name} ${student.legal_last_name}`}
        description={`Official student number: ${student.student_number}`}
      />
      <section className="grid gap-4 rounded-xl border bg-surface p-5 shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-muted">House</p>
          <p className="mt-1 font-medium">
            {student.house
              ? `${student.house.name} (${student.house.code})`
              : "Not assigned"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">Academic</p>
          <p className="mt-1 capitalize">{student.enrollment_status}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted">
            Competition eligibility
          </p>
          <div className="mt-1">
            <StatusBadge
              tone={
                student.eligibility_status === "eligible"
                  ? "success"
                  : student.eligibility_status === "ineligible"
                    ? "danger"
                    : "neutral"
              }
            >
              {student.eligibility_status}
            </StatusBadge>
          </div>
        </div>
        {student.eligibility_reason ? (
          <div className="sm:col-span-3">
            <p className="text-xs uppercase text-muted">Decision reason</p>
            <p className="mt-1 text-sm">{student.eligibility_reason}</p>
          </div>
        ) : null}
      </section>
      {canManage ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <div>
            <h2 className="mb-3 font-semibold">Official record</h2>
            <StudentForm
              houses={houseOptions}
              student={{
                id: student.id,
                studentNumber: student.student_number,
                firstName: student.legal_first_name,
                lastName: student.legal_last_name,
                otherNames: student.other_names,
                academicStatus: student.enrollment_status,
                houseId: student.house_id,
              }}
            />
          </div>
          <div>
            <h2 className="mb-3 font-semibold">Eligibility decision</h2>
            <EligibilityForm
              studentId={student.id}
              currentStatus={student.eligibility_status}
            />
          </div>
          <div>
            <h2 className="mb-3 font-semibold">Public result display</h2>
            <PublicResultIdentityForm
              studentId={student.id}
              publicName={student.public_results_name ?? ""}
              consented={Boolean(student.public_results_consent_at)}
            />
          </div>
        </div>
      ) : (
        <p className="rounded-lg border bg-surface-muted p-4 text-sm text-muted">
          You have read-only access to this official record.
        </p>
      )}
      <section>
        <h2 className="mb-3 font-semibold">Eligibility history</h2>
        {history?.length ? (
          <ol className="space-y-2">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border bg-surface p-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="capitalize">
                      {entry.previous_status ?? "No decision"}
                    </span>{" "}
                    →{" "}
                    <span className="font-medium capitalize">
                      {entry.new_status}
                    </span>
                  </p>
                  <time
                    className="text-xs text-muted"
                    dateTime={entry.changed_at}
                  >
                    {new Date(entry.changed_at).toLocaleString()}
                  </time>
                </div>
                <p className="mt-2 text-muted">{entry.reason}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-lg border bg-surface p-4 text-sm text-muted">
            No eligibility decisions have been recorded.
          </p>
        )}
      </section>
    </div>
  );
}
