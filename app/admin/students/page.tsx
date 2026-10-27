import Link from "next/link";

import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRoles } from "@/lib/auth/authorization";
import { adminAreaRoles, studentManagerRoles } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type SearchParams = Promise<{
  q?: string;
  house?: string;
  academic?: string;
  eligibility?: string;
  page?: string;
}>;
type StudentRow = {
  id: string;
  student_number: string;
  legal_first_name: string;
  legal_last_name: string;
  enrollment_status: string;
  eligibility_status: string;
  house: { id: string; name: string; code: string } | null;
};

function cleanSearch(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function pageHref(params: Record<string, string>, page: number) {
  const query = new URLSearchParams({ ...params, page: String(page) });
  return `/admin/students?${query.toString()}`;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, roles } = await requireRoles(adminAreaRoles);
  const raw = await searchParams;
  const q = cleanSearch(raw.q ?? "");
  const page = Math.max(1, Number.parseInt(raw.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const [{ data: houses }, houseCount] = await Promise.all([
    supabase.from("houses").select("id,name,code").order("name"),
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);
  void houseCount;

  let query = supabase
    .from("students")
    .select(
      "id,student_number,legal_first_name,legal_last_name,enrollment_status,eligibility_status,house:houses(id,name,code)",
      { count: "exact" },
    );
  if (q)
    query = query.or(
      `student_number.ilike.%${q}%,legal_first_name.ilike.%${q}%,legal_last_name.ilike.%${q}%`,
    );
  if (raw.house) query = query.eq("house_id", raw.house);
  if (
    ["enrolled", "suspended", "graduated", "withdrawn"].includes(
      raw.academic ?? "",
    )
  )
    query = query.eq("enrollment_status", raw.academic!);
  if (["unverified", "eligible", "ineligible"].includes(raw.eligibility ?? ""))
    query = query.eq("eligibility_status", raw.eligibility!);
  const { data, count, error } = await query
    .order("legal_last_name")
    .order("legal_first_name")
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error("The student register could not be loaded.");

  const students = (data ?? []) as unknown as StudentRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const preserved = Object.fromEntries(
    Object.entries({
      q,
      house: raw.house,
      academic: raw.academic,
      eligibility: raw.eligibility,
    }).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const canManage = studentManagerRoles.some((role) => roles.includes(role));
  const inputClass = "min-h-10 rounded-md border bg-white px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Student register"
        description="Search official student records and review academic and competition eligibility independently."
        actions={
          canManage ? (
            <Link className={buttonVariants()} href="/admin/students/new">
              Add student
            </Link>
          ) : undefined
        }
      />
      <form className="grid gap-3 rounded-xl border bg-surface p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="grid gap-1 text-xs font-medium">
          Student number or name
          <input
            className={inputClass}
            name="q"
            defaultValue={q}
            placeholder="Search register"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          House
          <select
            className={inputClass}
            name="house"
            defaultValue={raw.house ?? ""}
          >
            <option value="">All houses</option>
            {(houses ?? []).map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Academic
          <select
            className={inputClass}
            name="academic"
            defaultValue={raw.academic ?? ""}
          >
            <option value="">All statuses</option>
            <option value="enrolled">Enrolled</option>
            <option value="suspended">Suspended</option>
            <option value="graduated">Graduated</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Eligibility
          <select
            className={inputClass}
            name="eligibility"
            defaultValue={raw.eligibility ?? ""}
          >
            <option value="">All decisions</option>
            <option value="unverified">Unverified</option>
            <option value="eligible">Eligible</option>
            <option value="ineligible">Ineligible</option>
          </select>
        </label>
        <button className={cn(buttonVariants(), "self-end")} type="submit">
          Filter
        </button>
      </form>
      {students.length === 0 ? (
        <EmptyState
          title="No matching students"
          description="Adjust the filters or add a student if you have registration authority."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">House</th>
                  <th className="px-4 py-3">Academic</th>
                  <th className="px-4 py-3">Eligibility</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {student.legal_last_name}, {student.legal_first_name}
                      </p>
                      <p className="font-mono text-xs text-muted">
                        {student.student_number}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {student.house
                        ? `${student.house.name} (${student.house.code})`
                        : "Not assigned"}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {student.enrollment_status}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="font-medium text-primary underline-offset-4 hover:underline"
                        href={`/admin/students/${student.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted">
          {count ?? 0} record{count === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          <Link
            aria-disabled={page <= 1}
            className={cn(
              buttonVariants({ variant: "outline" }),
              page <= 1 && "pointer-events-none opacity-50",
            )}
            href={pageHref(preserved, Math.max(1, page - 1))}
          >
            Previous
          </Link>
          <span className="grid place-items-center px-2">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <Link
            aria-disabled={page >= totalPages}
            className={cn(
              buttonVariants({ variant: "outline" }),
              page >= totalPages && "pointer-events-none opacity-50",
            )}
            href={pageHref(preserved, Math.min(totalPages, page + 1))}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
