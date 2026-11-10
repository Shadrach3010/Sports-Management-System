"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  confirmStudentImport,
  inspectImportFile,
  validateImportFile,
} from "@/features/imports/actions";
import type {
  ColumnMapping,
  ImportField,
  ImportInspection,
  ImportValidationResult,
} from "@/features/imports/types";

const fields: { key: ImportField; label: string; optional?: boolean }[] = [
  { key: "studentNumber", label: "Student number" },
  {
    key: "fullName",
    label: "Full name (or map separate names)",
    optional: true,
  },
  { key: "firstName", label: "First name (if separate)", optional: true },
  { key: "lastName", label: "Last name (if separate)", optional: true },
  { key: "otherNames", label: "Other names", optional: true },
  { key: "academicStatus", label: "Academic status" },
  { key: "house", label: "House", optional: true },
];
const emptyMapping: ColumnMapping = {
  studentNumber: null,
  fullName: null,
  firstName: null,
  lastName: null,
  otherNames: null,
  academicStatus: null,
  house: null,
};
const issueLabels: Record<string, string> = {
  missing_student_number: "Missing student number",
  missing_first_name: "Missing first name",
  missing_last_name: "Missing last name",
  missing_full_name: "Missing full name",
  missing_academic_status: "Missing academic status",
  invalid_academic_status: "Invalid academic status",
  duplicate_in_file: "Duplicate in file",
  student_number_exists: "Already exists",
  unmatched_house: "Unmatched house",
};
const inputClass =
  "min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm";

function suggestMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const find = (...names: string[]) => {
    const index = normalized.findIndex((header) => names.includes(header));
    return index < 0 ? null : index;
  };
  const fullName = find("name", "fullname", "studentname");
  return {
    studentNumber: find(
      "studentnumber",
      "studentid",
      "registrationnumber",
      "admissionnumber",
    ),
    fullName,
    firstName: fullName === null ? find("firstname", "givenname") : null,
    lastName:
      fullName === null ? find("lastname", "surname", "familyname") : null,
    otherNames:
      fullName === null
        ? find("othernames", "middlename", "middlenames")
        : null,
    academicStatus: find("academicstatus", "enrollmentstatus", "status"),
    house: find("house", "housename", "housecode"),
  };
}

export function ImportWorkflow() {
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ImportInspection | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [validation, setValidation] = useState<ImportValidationResult | null>(
    null,
  );
  const [report, setReport] = useState<{
    batchId: string;
    importedRows: number;
    rejectedRows: number;
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setInspection(null);
    setMapping(emptyMapping);
    setValidation(null);
    setReport(null);
    setConfirmed(false);
    setMessage(null);
  }
  function inspect() {
    if (!file) return setMessage("Choose a CSV or XLSX file.");
    setMessage(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("file", file);
      const result = await inspectImportFile(form);
      if (!result.ok) return setMessage(result.message);
      setInspection(result.data);
      setMapping(suggestMapping(result.data.headers));
    });
  }
  function validate() {
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("file", file);
      form.set("mapping", JSON.stringify(mapping));
      const result = await validateImportFile(form);
      if (!result.ok) return setMessage(result.message);
      setValidation(result.data);
    });
  }
  function commit() {
    if (!validation) return;
    setMessage(null);
    startTransition(async () => {
      const result = await confirmStudentImport(validation.batchId, confirmed);
      if (!result.ok) return setMessage(result.message);
      setReport(result.data);
    });
  }

  if (report)
    return (
      <section className="rounded-xl border bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-success">
          Import completed
        </p>
        <h2 className="mt-1 text-xl font-semibold">Final import report</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-surface-muted p-4">
            <p className="text-2xl font-semibold">{report.importedRows}</p>
            <p className="text-sm text-muted">Students created as unverified</p>
          </div>
          <div className="rounded-lg bg-surface-muted p-4">
            <p className="text-2xl font-semibold">{report.rejectedRows}</p>
            <p className="text-sm text-muted">Rows rejected</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            className="text-sm font-semibold text-primary underline"
            href={`/admin/imports/${report.batchId}/errors`}
          >
            Export error report
          </a>
          <button
            className="text-sm font-semibold text-primary underline"
            onClick={reset}
          >
            Start another import
          </button>
        </div>
      </section>
    );

  return (
    <section className="space-y-5 rounded-xl border bg-surface p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Step {validation ? 4 : inspection ? 2 : 1} of 4
        </p>
        <h2 className="mt-1 text-xl font-semibold">
          {validation
            ? "Confirm import"
            : inspection
              ? "Map and validate columns"
              : "Upload register"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          CSV or XLSX only, maximum 5 MB and 5,000 data rows. Macros and
          formulas are never executed.
        </p>
        <p className="mt-2 text-sm text-muted">
          For the college sheet, map Student ID to student number, Name to full
          name, and Status to academic status. CURRENT becomes Enrolled and
          GRADUATED becomes Graduated. House is optional and can be assigned
          later. Email, Course, Active, and Last login are ignored.
        </p>
      </div>
      {!inspection ? (
        <div className="space-y-3">
          <input
            className={inputClass}
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button type="button" disabled={!file || isPending} onClick={inspect}>
            {isPending ? "Inspecting…" : "Preview file"}
          </Button>
        </div>
      ) : null}
      {inspection && !validation ? (
        <div className="space-y-5">
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-surface-muted">
                <tr>
                  {inspection.headers.map((header, index) => (
                    <th
                      className="whitespace-nowrap px-3 py-2"
                      key={`${header}-${index}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {inspection.sample.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {inspection.headers.map((_, columnIndex) => (
                      <td
                        className="max-w-56 truncate px-3 py-2"
                        key={columnIndex}
                      >
                        {row[columnIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <label className="grid gap-1 text-xs font-medium" key={field.key}>
                {field.label}
                {field.optional ? " (optional)" : ""}
                <select
                  className={inputClass}
                  value={mapping[field.key] ?? ""}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [field.key]:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                    }))
                  }
                >
                  <option value="">Not mapped</option>
                  {inspection.headers.map((header, index) => (
                    <option key={`${header}-${index}`} value={index}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {mapping.fullName !== null ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Full names are split at the first and last words; words between
              them become other names. Review the split below before importing
              official records.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={isPending} onClick={validate}>
              {isPending ? "Validating entire file…" : "Validate entire import"}
            </Button>
            <button
              className="text-sm font-semibold text-muted underline"
              type="button"
              onClick={reset}
            >
              Choose another file
            </button>
          </div>
        </div>
      ) : null}
      {validation ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries({
              Total: validation.summary.total,
              Valid: validation.summary.valid,
              Invalid: validation.summary.invalid,
              "Duplicate rows": validation.summary.duplicates,
              "Existing records": validation.summary.existing,
              "Unmatched houses": validation.summary.unmatchedHouses,
            }).map(([label, value]) => (
              <div className="rounded-lg bg-surface-muted p-3" key={label}>
                <p className="text-xl font-semibold">{value}</p>
                <p className="text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
          <div className="max-h-96 overflow-auto rounded-lg border">
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-muted">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Student number</th>
                  <th className="px-3 py-2">First name</th>
                  <th className="px-3 py-2">Other names</th>
                  <th className="px-3 py-2">Last name</th>
                  <th className="px-3 py-2">House</th>
                  <th className="px-3 py-2">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {validation.rows.map((row) => (
                  <tr key={row.row_number}>
                    <td className="px-3 py-2">{row.row_number}</td>
                    <td className="px-3 py-2 font-mono">
                      {row.student_number ?? "—"}
                    </td>
                    <td className="px-3 py-2">{row.legal_first_name ?? "—"}</td>
                    <td className="px-3 py-2">{row.other_names ?? "—"}</td>
                    <td className="px-3 py-2">{row.legal_last_name ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.source_house ?? "Assign later"}
                    </td>
                    <td className="px-3 py-2">
                      {row.issues.length ? (
                        row.issues
                          .map((issue) => issueLabels[issue] ?? issue)
                          .join(", ")
                      ) : (
                        <span className="text-success">Valid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validation.summary.total > validation.rows.length ? (
            <p className="text-xs text-muted">
              Showing the first {validation.rows.length} rows. The downloadable
              error report includes all rejected rows.
            </p>
          ) : null}
          <label className="flex items-start gap-3 rounded-lg border bg-surface-muted p-4 text-sm">
            <input
              className="mt-1"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I confirm that the mapping and validation report have been
              reviewed. Only valid, non-conflicting rows should be created, with
              eligibility set to unverified. Students without a source house
              remain unassigned until an authorized staff member assigns them.
            </span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={!confirmed || isPending}
              onClick={commit}
            >
              {isPending
                ? "Importing…"
                : `Confirm and import ${validation.summary.valid} valid row${validation.summary.valid === 1 ? "" : "s"}`}
            </Button>
            <a
              className="self-center text-sm font-semibold text-primary underline"
              href={`/admin/imports/${validation.batchId}/errors`}
            >
              Export current errors
            </a>
          </div>
        </div>
      ) : null}
      {message ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
