export type CsvValue = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

/** One CSV cell. Quotes and newlines are escaped, and text that a spreadsheet could run as a formula gets a leading single quote. */
export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "string" ? value : String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds a CSV document with CRLF line breaks, one header row first. */
export function toCsv(headers: readonly string[], rows: ReadonlyArray<readonly CsvValue[]>): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Safe file name part: lowercase letters, digits and dashes only. */
export function csvFileName(base: string, date = new Date()): string {
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "export";
  return `${slug}-${date.toISOString().slice(0, 10)}.csv`;
}

/** Saves a CSV through a Blob and a temporary anchor. A byte order mark keeps non-ASCII text intact in Excel. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
