import "server-only";

import Papa from "papaparse";
import { readSheet } from "read-excel-file/node";

import type { ParsedImport } from "@/features/imports/types";
import {
  MAX_IMPORT_ROWS,
  validateFileMetadata,
  validateFileSignature,
} from "@/features/imports/validation";

function textValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export async function parseStudentImport(file: File): Promise<ParsedImport> {
  const metadataError = validateFileMetadata(file);
  if (metadataError) throw new Error(metadataError);
  const extension = file.name.split(".").pop()!.toLowerCase() as "csv" | "xlsx";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signatureError = validateFileSignature(extension, bytes);
  if (signatureError) throw new Error(signatureError);
  let matrix: string[][];
  if (extension === "csv") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    if (result.errors.length)
      throw new Error(
        `The CSV could not be parsed at row ${result.errors[0]?.row ?? "unknown"}.`,
      );
    matrix = result.data.map((row) => row.map(textValue));
  } else {
    const rows = await readSheet(Buffer.from(bytes));
    matrix = rows.map((row) => row.map(textValue));
  }
  if (matrix.length < 2)
    throw new Error(
      "The file must contain a header and at least one student row.",
    );
  if (matrix.length - 1 > MAX_IMPORT_ROWS)
    throw new Error(
      `The file exceeds the ${MAX_IMPORT_ROWS.toLocaleString()}-row limit.`,
    );
  const headers = matrix[0].map(
    (header, index) => header || `Column ${index + 1}`,
  );
  if (headers.length > 100)
    throw new Error("The file contains too many columns.");
  return {
    headers,
    rows: matrix.slice(1),
    fileName: file.name,
    fileType: extension,
    fileSize: file.size,
  };
}
