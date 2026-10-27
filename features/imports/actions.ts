"use server";

import { createHash } from "node:crypto";

import type {
  ColumnMapping,
  ImportInspection,
  ImportValidationResult,
} from "@/features/imports/types";
import { parseStudentImport } from "@/features/imports/parser";
import {
  validateImportRows,
  validateMapping,
} from "@/features/imports/validation";
import { getSafeActionError, requireRoles } from "@/lib/auth/authorization";
import { studentManagerRoles } from "@/lib/auth/roles";

type ImportActionResult<T> =
  { ok: true; data: T } | { ok: false; message: string };

function getFile(formData: FormData) {
  const value = formData.get("file");
  if (!(value instanceof File))
    throw new Error("Choose a student register file.");
  return value;
}

export async function inspectImportFile(
  formData: FormData,
): Promise<ImportActionResult<ImportInspection>> {
  try {
    await requireRoles(studentManagerRoles);
    const parsed = await parseStudentImport(getFile(formData));
    return {
      ok: true,
      data: {
        headers: parsed.headers,
        sample: parsed.rows.slice(0, 8),
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        fileSize: parsed.fileSize,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionError(
        error,
        error instanceof Error ? error.message : undefined,
      ),
    };
  }
}

export async function validateImportFile(
  formData: FormData,
): Promise<ImportActionResult<ImportValidationResult>> {
  try {
    const { supabase } = await requireRoles(studentManagerRoles);
    const file = getFile(formData);
    const parsed = await parseStudentImport(file);
    let mapping: ColumnMapping;
    try {
      mapping = JSON.parse(String(formData.get("mapping"))) as ColumnMapping;
    } catch {
      return { ok: false, message: "The column mapping is invalid." };
    }
    const mappingError = validateMapping(mapping, parsed.headers.length);
    if (mappingError) return { ok: false, message: mappingError };
    const studentNumbers = parsed.rows
      .map((row) =>
        mapping.studentNumber === null
          ? ""
          : String(row[mapping.studentNumber] ?? "").trim(),
      )
      .filter(Boolean);
    const [
      { data: houses, error: houseError },
      { data: existing, error: existingError },
    ] = await Promise.all([
      supabase.from("houses").select("id,name,code").eq("is_active", true),
      supabase.rpc("check_existing_student_numbers", {
        p_numbers: studentNumbers,
      }),
    ]);
    if (houseError || existingError)
      return {
        ok: false,
        message: "The register could not be checked against current records.",
      };
    const existingNumbers = new Set(
      ((existing ?? []) as { student_number: string }[]).map((item) =>
        item.student_number.toLowerCase(),
      ),
    );
    const { stagedRows, summary } = validateImportRows(
      parsed.rows,
      mapping,
      houses ?? [],
      existingNumbers,
    );
    const hash = createHash("sha256")
      .update(Buffer.from(await file.arrayBuffer()))
      .digest("hex");
    const { data: batchId, error } = await supabase.rpc(
      "stage_student_import",
      {
        p_file_name: parsed.fileName,
        p_file_type: parsed.fileType,
        p_file_size_bytes: parsed.fileSize,
        p_file_sha256: hash,
        p_column_mapping: mapping,
        p_rows: stagedRows,
      },
    );
    if (error || typeof batchId !== "string")
      return {
        ok: false,
        message: "The validated import could not be staged securely.",
      };
    return {
      ok: true,
      data: { batchId, rows: stagedRows.slice(0, 100), summary },
    };
  } catch (error) {
    return {
      ok: false,
      message: getSafeActionError(
        error,
        error instanceof Error ? error.message : undefined,
      ),
    };
  }
}

export async function confirmStudentImport(
  batchId: string,
  confirmed: boolean,
): Promise<
  ImportActionResult<{
    batchId: string;
    importedRows: number;
    rejectedRows: number;
  }>
> {
  try {
    const { supabase } = await requireRoles(studentManagerRoles);
    if (!confirmed)
      return {
        ok: false,
        message:
          "Explicit confirmation is required before records are created.",
      };
    if (!/^[0-9a-f-]{36}$/i.test(batchId))
      return { ok: false, message: "The import batch is invalid." };
    const { data, error } = await supabase.rpc("commit_student_import", {
      p_batch_id: batchId,
    });
    if (error)
      return {
        ok: false,
        message: error.message.includes("no longer pending")
          ? "This import has already been processed."
          : "The import could not be completed.",
      };
    const result = data as {
      batch_id: string;
      imported_rows: number;
      rejected_rows: number;
    };
    return {
      ok: true,
      data: {
        batchId: result.batch_id,
        importedRows: result.imported_rows,
        rejectedRows: result.rejected_rows,
      },
    };
  } catch (error) {
    return { ok: false, message: getSafeActionError(error) };
  }
}
