/** Minimal CSV helpers for admin report exports. */
export function toCsv(rows: Array<Record<string, unknown>>, headers?: string[]): string {
  const cols = headers ?? Object.keys(rows[0] ?? {});
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  // Prepend BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
