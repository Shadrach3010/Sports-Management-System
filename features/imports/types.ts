export type ImportField =
  | "studentNumber"
  | "firstName"
  | "lastName"
  | "otherNames"
  | "academicStatus"
  | "house";
export type ColumnMapping = Record<ImportField, number | null>;
export type ImportIssue =
  | "missing_student_number"
  | "missing_first_name"
  | "missing_last_name"
  | "missing_academic_status"
  | "missing_house"
  | "invalid_academic_status"
  | "duplicate_in_file"
  | "student_number_exists"
  | "unmatched_house";
export type ImportHouse = { id: string; name: string; code: string };
export type ParsedImport = {
  headers: string[];
  rows: string[][];
  fileName: string;
  fileType: "csv" | "xlsx";
  fileSize: number;
};
export type StagedImportRow = {
  row_number: number;
  student_number: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
  other_names: string | null;
  enrollment_status: string | null;
  house_id: string | null;
  source_house: string | null;
  issues: ImportIssue[];
};
export type ImportSummary = {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  existing: number;
  unmatchedHouses: number;
  missingFields: number;
};

export type ImportInspection = {
  headers: string[];
  sample: string[][];
  fileName: string;
  fileType: "csv" | "xlsx";
  fileSize: number;
};
export type ImportValidationResult = {
  batchId: string;
  rows: StagedImportRow[];
  summary: ImportSummary;
};
