"use client";

import { Download } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { csvFileName, downloadCsv, toCsv, type CsvValue } from "@/lib/export/csv";

/** Downloads the rows currently on screen as a CSV file. Disabled when there is nothing to export. */
export function ExportButton({ name, headers, rows }: { name: string; headers: readonly string[]; rows: ReadonlyArray<readonly CsvValue[]> }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-sm"
      disabled={rows.length === 0}
      onClick={() => {
        downloadCsv(csvFileName(name), toCsv(headers, rows));
        toast.success("CSV downloaded", `${rows.length} row${rows.length === 1 ? "" : "s"} exported.`);
      }}
    >
      <Download size={14} aria-hidden="true" /> Export CSV
    </button>
  );
}
