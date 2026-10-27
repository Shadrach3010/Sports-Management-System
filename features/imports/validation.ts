import type {
  ColumnMapping,
  ImportHouse,
  ImportIssue,
  ImportSummary,
  StagedImportRow,
} from "@/features/imports/types";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;
export const acceptedImportExtensions = ["csv", "xlsx"] as const;
const academicStatuses = new Set([
  "enrolled",
  "suspended",
  "graduated",
  "withdrawn",
]);

export function validateFileMetadata(
  file: Pick<File, "name" | "size" | "type">,
) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    !extension ||
    !acceptedImportExtensions.includes(
      extension as (typeof acceptedImportExtensions)[number],
    )
  )
    return "Upload a CSV or XLSX file. Macro-enabled and legacy spreadsheet files are not accepted.";
  if (file.size < 1) return "The file is empty.";
  if (file.size > MAX_IMPORT_BYTES) return "The file exceeds the 5 MB limit.";
  const allowed =
    extension === "csv"
      ? [
          "text/csv",
          "application/csv",
          "text/plain",
          "application/vnd.ms-excel",
          "application/octet-stream",
          "",
        ]
      : [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/octet-stream",
          "",
        ];
  return allowed.includes(file.type)
    ? null
    : "The file content type does not match its extension.";
}

export function validateFileSignature(
  fileType: "csv" | "xlsx",
  bytes: Uint8Array,
) {
  if (fileType === "xlsx" && (bytes[0] !== 0x50 || bytes[1] !== 0x4b))
    return "The XLSX content is not a valid Open XML spreadsheet.";
  if (fileType === "csv" && bytes.includes(0))
    return "The CSV contains invalid binary content.";
  return null;
}

export function validateMapping(mapping: ColumnMapping, headerCount: number) {
  const required = [
    "studentNumber",
    "firstName",
    "lastName",
    "academicStatus",
    "house",
  ] as const;
  if (required.some((field) => mapping[field] === null))
    return "Map every required field before validation.";
  const selected = Object.values(mapping).filter(
    (value): value is number => value !== null,
  );
  if (
    selected.some(
      (value) => !Number.isInteger(value) || value < 0 || value >= headerCount,
    )
  )
    return "The column mapping is invalid.";
  if (new Set(selected).size !== selected.length)
    return "Each source column can only be mapped once.";
  return null;
}

function cell(row: string[], index: number | null) {
  if (index === null) return null;
  const value = String(row[index] ?? "").trim();
  return value || null;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function validateImportRows(
  rows: string[][],
  mapping: ColumnMapping,
  houses: ImportHouse[],
  existingStudentNumbers: Set<string>,
) {
  const houseLookup = new Map<string, ImportHouse>();
  houses.forEach((house) => {
    houseLookup.set(house.code.trim().toLowerCase(), house);
    houseLookup.set(house.name.trim().toLowerCase(), house);
  });
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const value = cell(row, mapping.studentNumber)?.toLowerCase();
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  const stagedRows: StagedImportRow[] = rows.map((row, index) => {
    const studentNumber = cell(row, mapping.studentNumber);
    const firstName = cell(row, mapping.firstName);
    const lastName = cell(row, mapping.lastName);
    const academicStatus =
      cell(row, mapping.academicStatus)?.toLowerCase() ?? null;
    const sourceHouse = cell(row, mapping.house);
    const matchedHouse = sourceHouse
      ? houseLookup.get(sourceHouse.toLowerCase())
      : undefined;
    const issues: ImportIssue[] = [];
    if (!studentNumber) issues.push("missing_student_number");
    if (!firstName) issues.push("missing_first_name");
    if (!lastName) issues.push("missing_last_name");
    if (!academicStatus) issues.push("missing_academic_status");
    else if (!academicStatuses.has(academicStatus))
      issues.push("invalid_academic_status");
    if (!sourceHouse) issues.push("missing_house");
    else if (!matchedHouse) issues.push("unmatched_house");
    if (studentNumber && (counts.get(studentNumber.toLowerCase()) ?? 0) > 1)
      issues.push("duplicate_in_file");
    if (
      studentNumber &&
      existingStudentNumbers.has(studentNumber.toLowerCase())
    )
      issues.push("student_number_exists");
    return {
      row_number: index + 2,
      student_number: studentNumber,
      legal_first_name: firstName,
      legal_last_name: lastName,
      other_names: cell(row, mapping.otherNames),
      enrollment_status: academicStatuses.has(academicStatus ?? "")
        ? academicStatus
        : null,
      house_id: matchedHouse?.id ?? null,
      source_house: sourceHouse,
      issues: unique(issues),
    };
  });

  const summary: ImportSummary = {
    total: stagedRows.length,
    valid: stagedRows.filter((row) => row.issues.length === 0).length,
    invalid: stagedRows.filter((row) => row.issues.length > 0).length,
    duplicates: stagedRows.filter((row) =>
      row.issues.includes("duplicate_in_file"),
    ).length,
    existing: stagedRows.filter((row) =>
      row.issues.includes("student_number_exists"),
    ).length,
    unmatchedHouses: stagedRows.filter((row) =>
      row.issues.includes("unmatched_house"),
    ).length,
    missingFields: stagedRows.filter((row) =>
      row.issues.some((issue) => issue.startsWith("missing_")),
    ).length,
  };
  return { stagedRows, summary };
}
