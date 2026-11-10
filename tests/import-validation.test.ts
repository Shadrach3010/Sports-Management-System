import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_IMPORT_BYTES,
  validateFileMetadata,
  validateFileSignature,
  validateImportRows,
  validateMapping,
} from "../features/imports/validation.ts";
import type { ColumnMapping, ImportHouse } from "../features/imports/types.ts";

const mapping: ColumnMapping = {
  studentNumber: 0,
  fullName: null,
  firstName: 1,
  lastName: 2,
  otherNames: 3,
  academicStatus: 4,
  house: 5,
};
const houses: ImportHouse[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    name: "Unity House",
    code: "UNI",
  },
];

test("rejects unsupported and oversized files", () => {
  assert.match(
    validateFileMetadata({
      name: "students.xlsm",
      size: 100,
      type: "application/vnd.ms-excel.sheet.macroEnabled.12",
    }) ?? "",
    /CSV or XLSX/,
  );
  assert.match(
    validateFileMetadata({
      name: "students.csv",
      size: MAX_IMPORT_BYTES + 1,
      type: "text/csv",
    }) ?? "",
    /5 MB/,
  );
});

test("rejects content that does not match a safe CSV or XLSX container", () => {
  assert.match(
    validateFileSignature("xlsx", new Uint8Array([1, 2, 3])) ?? "",
    /Open XML/,
  );
  assert.match(
    validateFileSignature("csv", new Uint8Array([65, 0, 66])) ?? "",
    /binary content/,
  );
  assert.equal(
    validateFileSignature("xlsx", new Uint8Array([0x50, 0x4b, 3, 4])),
    null,
  );
});

test("requires every mandatory column and prevents duplicate mappings", () => {
  assert.match(
    validateMapping({ ...mapping, lastName: null }, 6) ?? "",
    /either full name or separate/,
  );
  assert.equal(validateMapping({ ...mapping, house: null }, 6), null);
  assert.match(
    validateMapping({ ...mapping, house: 0 }, 6) ?? "",
    /only be mapped once/,
  );
});

test("maps the college sheet full name and CURRENT status without a house", () => {
  const collegeMapping: ColumnMapping = {
    studentNumber: 0,
    fullName: 1,
    firstName: null,
    lastName: null,
    otherNames: null,
    academicStatus: 5,
    house: null,
  };
  assert.equal(validateMapping(collegeMapping, 8), null);
  const { stagedRows, summary } = validateImportRows(
    [
      [
        "905005991",
        "Aaliyah Blessing Christine Mc'Ewen",
        "",
        "",
        "",
        "CURRENT",
        "Active",
        "Never",
      ],
    ],
    collegeMapping,
    houses,
    new Set(),
  );
  assert.equal(summary.valid, 1);
  assert.deepEqual(
    {
      first: stagedRows[0].legal_first_name,
      other: stagedRows[0].other_names,
      last: stagedRows[0].legal_last_name,
      academic: stagedRows[0].enrollment_status,
      house: stagedRows[0].house_id,
    },
    {
      first: "Aaliyah",
      other: "Blessing Christine",
      last: "Mc'Ewen",
      academic: "enrolled",
      house: null,
    },
  );
});

test("rejects a one-word full name and a supplied unmatched house", () => {
  const fullNameMapping: ColumnMapping = {
    ...mapping,
    fullName: 1,
    firstName: null,
    lastName: null,
    otherNames: null,
    academicStatus: 2,
    house: 3,
  };
  const { stagedRows } = validateImportRows(
    [["ST-100", "Aaliyah", "CURRENT", "Unknown House"]],
    fullNameMapping,
    houses,
    new Set(),
  );
  assert.deepEqual(stagedRows[0].issues, [
    "missing_last_name",
    "unmatched_house",
  ]);
});

test("detects duplicate rows within one import", () => {
  const { stagedRows, summary } = validateImportRows(
    [
      ["ST-001", "Ada", "Cole", "", "enrolled", "UNI"],
      ["st-001", "Amara", "Cole", "", "enrolled", "Unity House"],
    ],
    mapping,
    houses,
    new Set(),
  );
  assert.equal(summary.duplicates, 2);
  assert.ok(
    stagedRows.every((row) => row.issues.includes("duplicate_in_file")),
  );
});

test("reports missing required fields and unmatched houses", () => {
  const { stagedRows, summary } = validateImportRows(
    [["", "", "Kamara", "", "", "Unknown"]],
    mapping,
    houses,
    new Set(),
  );
  assert.equal(summary.missingFields, 1);
  assert.equal(summary.unmatchedHouses, 1);
  assert.deepEqual(stagedRows[0].issues, [
    "missing_student_number",
    "missing_first_name",
    "missing_academic_status",
    "unmatched_house",
  ]);
});

test("detects conflicts with existing student records without silently overwriting", () => {
  const { stagedRows, summary } = validateImportRows(
    [["ST-009", "Mariama", "Sesay", "", "enrolled", "UNI"]],
    mapping,
    houses,
    new Set(["st-009"]),
  );
  assert.equal(summary.existing, 1);
  assert.deepEqual(stagedRows[0].issues, ["student_number_exists"]);
});

test("keeps valid and invalid rows separate for transparent partial commits", () => {
  const { stagedRows, summary } = validateImportRows(
    [
      ["ST-010", "Ibrahim", "Bangura", "", "enrolled", "UNI"],
      ["ST-011", "Fatmata", "Koroma", "", "unknown", "UNI"],
    ],
    mapping,
    houses,
    new Set(),
  );
  assert.deepEqual(summary, {
    total: 2,
    valid: 1,
    invalid: 1,
    duplicates: 0,
    existing: 0,
    unmatchedHouses: 0,
    missingFields: 0,
  });
  assert.equal(stagedRows[0].issues.length, 0);
  assert.deepEqual(stagedRows[1].issues, ["invalid_academic_status"]);
});
