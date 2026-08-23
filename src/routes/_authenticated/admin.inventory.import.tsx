import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  IMPORT_COLUMNS,
  IMPORT_SAMPLE_ROWS,
  csvToRecords,
  formatIdr,
  formatQty,
  normaliseRow,
  publicPrice,

  type InventoryDraft,
} from "@/lib/meatlink/inventory";
import { useBi } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/inventory/import")({
  component: InventoryImportPage,
  head: () => ({
    meta: [
      { title: "Import inventory — Meatlink admin" },
      {
        name: "description",
        content: "Bulk upload the Meatlink house inventory from an Excel or CSV spreadsheet.",
      },
    ],
  }),
});

function InventoryImportPage() {
  const bi = useBi();
  return (
    <AppShell
      title={bi("Impor inventaris", "Import inventory")}
      intro={bi(
        "Unggah file Excel atau CSV menggunakan template Meatlink. Tinjau pratinjau sebelum menyimpan ke database.",
        "Upload an Excel or CSV file using the Meatlink template. Review the preview before writing to the database.",
      )}
      actions={
        <Link to="/admin/inventory" className="eyebrow border border-ink/25 px-5 py-3 text-ink">
          {bi("Kembali ke inventaris", "Back to inventory")}
        </Link>
      }
    >
      <RoleGate allow="admin">
        <ImportBody />
      </RoleGate>
    </AppShell>
  );
}

type Mode = "append" | "replace";

function ImportBody() {
  const bi = useBi();
  const [rows, setRows] = useState<InventoryDraft[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<Mode>("append");
  const [pending, setPending] = useState(false);

  function downloadTemplate() {
    const sheet = XLSX.utils.aoa_to_sheet([[...IMPORT_COLUMNS], ...IMPORT_SAMPLE_ROWS]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Inventory");
    XLSX.writeFile(book, "meatlink-inventory-template.xlsx");
  }

  async function onFile(file: File) {
    setFileName(file.name);
    const collected: string[] = [];
    let records: Record<string, unknown>[] = [];

    if (file.name.toLowerCase().endsWith(".csv")) {
      records = csvToRecords(await file.text());
    } else {
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const first = book.SheetNames[0];
      if (!first) {
        setErrors([bi("Berkas tidak memiliki sheet.", "The workbook has no sheets.")]);
        setRows([]);
        return;
      }
      records = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[first]!, { defval: "" });
    }

    const parsed: InventoryDraft[] = [];
    records.forEach((record, i) => {
      const result = normaliseRow(record, i + 2, collected);
      if (result) parsed.push(result.item);
    });

    setRows(parsed);
    setErrors(collected);
    if (parsed.length === 0 && collected.length === 0) {
      setErrors([bi("Tidak ada baris yang dapat digunakan. Periksa apakah header sesuai template.", "No usable rows found. Check that the header matches the template.")]);
    }
  }

  async function commit() {
    if (rows.length === 0) return;
    setPending(true);
    try {
      if (mode === "replace") {
        const { error } = await supabase.from("admin_inventory").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      }
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from("admin_inventory").insert(rows.slice(i, i + 200));
        if (error) throw error;
      }
      toast.success(bi(`${rows.length} item berhasil diimpor.`, `${rows.length} items imported.`));
      setRows([]);
      setErrors([]);
      setFileName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : bi("Impor gagal.", "Import failed."));
    } finally {
      setPending(false);
    }
  }

  const totalKg = rows.reduce((s, r) => s + r.qty_on_hand_kg, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="p-6 lg:col-span-1">
        <p className="eyebrow text-ash">{bi("Langkah 1 — template", "Step 1 — template")}</p>
        <p className="mt-3 text-sm text-ash">
          {bi("Kolom", "Columns")}: {IMPORT_COLUMNS.join(", ")}. {bi("Condition menerima FRZ atau CHL. Harga dalam IDR per kg.", "Condition accepts FRZ or CHL. Prices are IDR per kg.")}
          {" "}
          {bi("Biarkan", "Leave")} <span className="text-ink">markup_idr</span> {bi("kosong untuk otomatis menerapkan Rp 150.000 untuk A5 dan Rp 60.000 untuk lainnya.", "blank to auto-apply Rp 150.000 for A5 and Rp 60.000 for the rest.")}
        </p>

        <button
          type="button"
          onClick={downloadTemplate}
          className="eyebrow mt-4 w-full border border-ink/25 px-5 py-3 text-ink"
        >
          {bi("Unduh template .xlsx", "Download .xlsx template")}
        </button>

        <p className="eyebrow mt-8 text-ash">{bi("Langkah 2 — unggah", "Step 2 — upload")}</p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          aria-label={bi("Spreadsheet inventaris", "Inventory spreadsheet")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
          className="mt-3 w-full border border-line bg-card px-4 py-3 text-sm text-ink"
        />
        {fileName ? <p className="mt-2 text-xs text-ash">{fileName}</p> : null}

        <p className="eyebrow mt-8 text-ash">{bi("Langkah 3 — mode", "Step 3 — mode")}</p>
        <div className="mt-3 grid gap-2 text-sm text-ink">
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="mode"
              checked={mode === "append"}
              onChange={() => setMode("append")}
              className="mt-1"
            />
            <span>
              {bi("Tambahkan ke daftar yang ada", "Add to existing list")}
              <span className="block text-xs text-ash">{bi("Mempertahankan item saat ini dan menambahkan berkas.", "Keeps current items and appends the file.")}</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="mode"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
              className="mt-1"
            />
            <span>
              {bi("Ganti semuanya", "Replace everything")}
              <span className="block text-xs text-ash">{bi("Menghapus semua inventaris saat ini terlebih dahulu.", "Deletes all current inventory first.")}</span>
            </span>
          </label>
        </div>

        <button
          type="button"
          disabled={pending || rows.length === 0}
          onClick={() => void commit()}
          className="eyebrow mt-6 w-full bg-crimson px-6 py-4 text-bone disabled:opacity-50"
        >
          {pending ? bi("Mengimpor…", "Importing…") : bi(`Impor ${rows.length} item`, `Import ${rows.length} item(s)`)}
        </button>
      </Panel>

      <div className="grid gap-5 lg:col-span-2">
        {errors.length > 0 ? (
          <Panel className="border-crimson/40 p-5">
            <p className="eyebrow text-crimson">{bi(`${errors.length} baris bermasalah dilewati`, `${errors.length} row issue(s) skipped`)}</p>
            <ul className="mt-3 grid gap-1 text-sm text-ash">
              {errors.slice(0, 20).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {rows.length > 0 ? (
          <Panel className="overflow-x-auto">
            <p className="border-b border-line px-4 py-3 text-xs text-ash">
              {bi(`Pratinjau — ${rows.length} baris, total ${formatQty(totalKg)}`, `Preview — ${rows.length} rows, ${formatQty(totalKg)} total`)}
            </p>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
                <tr>
                  <th className="px-4 py-3">{bi("Produk", "Product")}</th>
                  <th className="px-4 py-3">{bi("Asal", "Origin")}</th>
                  <th className="px-4 py-3">{bi("Merek", "Brand")}</th>
                  <th className="px-4 py-3">{bi("Dasar / kg", "Base / kg")}</th>
                  <th className="px-4 py-3">{bi("Markup / kg", "Markup / kg")}</th>
                  <th className="px-4 py-3">{bi("Publik / kg", "Public / kg")}</th>
                  <th className="px-4 py-3">{bi("Jumlah", "Qty")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 text-ink">{r.name}</td>
                    <td className="px-4 py-3 text-ash">{r.origin}</td>
                    <td className="px-4 py-3 text-xs text-ash">{r.brand || "—"}</td>
                    <td className="px-4 py-3 text-ash">{formatIdr(r.sale_price_idr)}</td>
                    <td className="px-4 py-3 text-ash">{formatIdr(r.markup_idr)}</td>
                    <td className="px-4 py-3 text-ink">
                      {formatIdr(publicPrice(r.sale_price_idr, r.markup_idr))}
                    </td>
                    <td className="px-4 py-3 text-ash">{formatQty(r.qty_on_hand_kg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length > 50 ? (
              <p className="border-t border-line px-4 py-3 text-xs text-ash">
                {bi(`Menampilkan 50 pertama dari ${rows.length} baris.`, `Showing first 50 of ${rows.length} rows.`)}
              </p>
            ) : null}
          </Panel>
        ) : (
          <Panel className="p-10 text-center text-sm text-ash">
            {bi("Unggah berkas untuk melihat pratinjau baris sebelum mengimpor.", "Upload a file to preview the rows before importing.")}
          </Panel>
        )}
      </div>
    </div>
  );
}
