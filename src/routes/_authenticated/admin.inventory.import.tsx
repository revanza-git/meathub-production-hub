import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_IMPORT_QTY_KG,
  IMPORT_COLUMNS,
  IMPORT_SAMPLE_ROWS,
  csvToRecords,
  formatIdr,
  formatQty,
  inventoryKey,
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
        "Unggah file Excel atau CSV menggunakan template Meatlink. Tinjau ringkasan perubahan dan cek duplikat sebelum menyimpan.",
        "Upload an Excel or CSV file using the Meatlink template. Review the change summary and duplicate check before saving.",
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

type Mode = "append" | "upsert" | "replace";
type Status = "new" | "update" | "duplicate";
type Row = { item: InventoryDraft; key: string; status: Status; existingId?: string };

function ImportBody() {
  const bi = useBi();
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<Mode>("upsert");
  const [defaultQty, setDefaultQty] = useState(String(DEFAULT_IMPORT_QTY_KG));
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

    const fallback = Number(defaultQty.replace(/[^\d.]/g, "")) || 0;
    const parsed: InventoryDraft[] = [];
    records.forEach((record, i) => {
      const result = normaliseRow(record, i + 2, collected, { defaultQtyKg: fallback });
      if (result) parsed.push(result.item);
    });

    // Existing catalogue keyed by brand + name so we never create a second slug/SKU.
    const existing = new Map<string, string>();
    const { data, error } = await supabase.from("admin_inventory").select("id, brand, name");
    if (error) {
      setErrors([error.message]);
      setRows([]);
      return;
    }
    (data ?? []).forEach((r) => existing.set(inventoryKey(r.brand ?? "", r.name ?? ""), r.id));

    const seen = new Set<string>();
    const mapped: Row[] = parsed.map((item) => {
      const key = inventoryKey(item.brand, item.name);
      if (seen.has(key)) return { item, key, status: "duplicate" };
      seen.add(key);
      const existingId = existing.get(key);
      return existingId
        ? { item, key, status: "update", existingId }
        : { item, key, status: "new" };
    });

    mapped
      .filter((r) => r.status === "duplicate")
      .forEach((r) =>
        collected.push(
          bi(
            `Duplikat dalam berkas dilewati: ${r.item.brand} — ${r.item.name}`,
            `Duplicate row in file skipped: ${r.item.brand} — ${r.item.name}`,
          ),
        ),
      );

    setRows(mapped);
    setErrors(collected);
    if (mapped.length === 0 && collected.length === 0) {
      setErrors([
        bi(
          "Tidak ada baris yang dapat digunakan. Periksa apakah header sesuai template.",
          "No usable rows found. Check that the header matches the template.",
        ),
      ]);
    }
  }

  const news = rows.filter((r) => r.status === "new");
  const updates = rows.filter((r) => r.status === "update");
  const dupes = rows.filter((r) => r.status === "duplicate");
  const applied = mode === "append" ? news : mode === "upsert" ? [...news, ...updates] : [...news, ...updates];
  const totalKg = applied.reduce((s, r) => s + r.item.qty_on_hand_kg, 0);

  async function commit() {
    if (applied.length === 0) return;
    setPending(true);
    try {
      if (mode === "replace") {
        const { error } = await supabase
          .from("admin_inventory")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      }

      const inserts = mode === "replace" ? applied : news;
      for (let i = 0; i < inserts.length; i += 200) {
        const { error } = await supabase
          .from("admin_inventory")
          .insert(inserts.slice(i, i + 200).map((r) => r.item));
        if (error) throw error;
      }

      if (mode === "upsert") {
        for (const row of updates) {
          const { error } = await supabase
            .from("admin_inventory")
            .update(row.item)
            .eq("id", row.existingId!);
          if (error) throw error;
        }
      }

      toast.success(
        bi(
          `${inserts.length} item baru, ${mode === "upsert" ? updates.length : 0} diperbarui.`,
          `${inserts.length} new item(s), ${mode === "upsert" ? updates.length : 0} updated.`,
        ),
      );
      setRows([]);
      setErrors([]);
      setFileName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : bi("Impor gagal.", "Import failed."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Panel className="p-6 lg:col-span-1">
        <p className="eyebrow text-ash">{bi("Langkah 1 — template", "Step 1 — template")}</p>
        <p className="mt-3 text-sm text-ash">
          {bi("Kolom", "Columns")}: {IMPORT_COLUMNS.join(", ")}.{" "}
          {bi(
            "Condition menerima FRZ atau CHL. Harga dalam IDR per kg. Kolom category, grade_band, dan cut_type diisi otomatis dari nama produk bila dikosongkan.",
            "Condition accepts FRZ or CHL. Prices are IDR per kg. Blank category, grade_band and cut_type are mapped automatically from the product name.",
          )}{" "}
          {bi("Biarkan", "Leave")} <span className="text-ink">markup_idr</span>{" "}
          {bi(
            "kosong untuk otomatis menerapkan Rp 150.000 untuk A5 dan Rp 60.000 untuk lainnya.",
            "blank to auto-apply Rp 150.000 for A5 and Rp 60.000 for the rest.",
          )}
        </p>

        <button
          type="button"
          onClick={downloadTemplate}
          className="eyebrow mt-4 w-full border border-ink/25 px-5 py-3 text-ink"
        >
          {bi("Unduh template .xlsx", "Download .xlsx template")}
        </button>

        <p className="eyebrow mt-8 text-ash">{bi("Langkah 2 — stok default", "Step 2 — default stock")}</p>
        <label className="mt-3 block text-sm text-ash">
          {bi("Stok awal (kg) untuk baris tanpa jumlah", "Initial stock (kg) for rows without a quantity")}
          <input
            type="number"
            min={0}
            value={defaultQty}
            onChange={(e) => setDefaultQty(e.target.value)}
            className="mt-2 w-full border border-line bg-card px-4 py-3 text-sm text-ink"
          />
        </label>

        <p className="eyebrow mt-8 text-ash">{bi("Langkah 3 — unggah", "Step 3 — upload")}</p>
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

        <p className="eyebrow mt-8 text-ash">{bi("Langkah 4 — mode", "Step 4 — mode")}</p>
        <div className="mt-3 grid gap-2 text-sm text-ink">
          {(
            [
              [
                "upsert",
                bi("Tambah & perbarui", "Add & update"),
                bi("Item baru ditambahkan, item yang sudah ada diperbarui (tanpa slug ganda).", "New items are added, existing items are updated (no duplicate slugs)."),
              ],
              [
                "append",
                bi("Hanya tambah item baru", "Only add new items"),
                bi("Item yang sudah ada dilewati.", "Existing items are skipped."),
              ],
              [
                "replace",
                bi("Ganti semuanya", "Replace everything"),
                bi("Menghapus semua inventaris saat ini terlebih dahulu.", "Deletes all current inventory first."),
              ],
            ] as [Mode, string, string][]
          ).map(([value, label, hint]) => (
            <label key={value} className="flex items-start gap-3">
              <input
                type="radio"
                name="mode"
                checked={mode === value}
                onChange={() => setMode(value)}
                className="mt-1"
              />
              <span>
                {label}
                <span className="block text-xs text-ash">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          disabled={pending || applied.length === 0}
          onClick={() => void commit()}
          className="eyebrow mt-6 w-full bg-crimson px-6 py-4 text-bone disabled:opacity-50"
        >
          {pending
            ? bi("Mengimpor…", "Importing…")
            : bi(`Simpan ${applied.length} perubahan`, `Save ${applied.length} change(s)`)}
        </button>
      </Panel>

      <div className="grid gap-5 lg:col-span-2">
        {rows.length > 0 ? (
          <Panel className="p-5">
            <p className="eyebrow text-ash">{bi("Ringkasan perubahan", "Change summary")}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <Stat label={bi("Item baru", "New items")} value={String(news.length)} />
              <Stat
                label={bi("Diperbarui", "Updated")}
                value={mode === "append" ? "0" : String(updates.length)}
              />
              <Stat label={bi("Duplikat dilewati", "Duplicates skipped")} value={String(dupes.length)} />
              <Stat label={bi("Total stok", "Total stock")} value={formatQty(totalKg)} />
            </div>
            <p className="mt-4 text-xs text-ash">
              {bi(
                "Kecocokan dicek dari kombinasi merek + nama produk, sehingga slug/SKU publik tidak pernah tergandakan.",
                "Matching uses brand + product name, so public slugs/SKUs are never duplicated.",
              )}
            </p>
          </Panel>
        ) : null}

        {errors.length > 0 ? (
          <Panel className="border-crimson/40 p-5">
            <p className="eyebrow text-crimson">
              {bi(`${errors.length} baris bermasalah dilewati`, `${errors.length} row issue(s) skipped`)}
            </p>
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
              {bi(`Pratinjau — ${rows.length} baris`, `Preview — ${rows.length} rows`)}
            </p>
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
                <tr>
                  <th className="px-4 py-3">{bi("Status", "Status")}</th>
                  <th className="px-4 py-3">{bi("Produk", "Product")}</th>
                  <th className="px-4 py-3">{bi("Merek", "Brand")}</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Cut</th>
                  <th className="px-4 py-3">{bi("Dasar / kg", "Base / kg")}</th>
                  <th className="px-4 py-3">{bi("Publik / kg", "Public / kg")}</th>
                  <th className="px-4 py-3">{bi("Jumlah", "Qty")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={`${r.key}-${i}`} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <StatusTag status={r.status} mode={mode} />
                    </td>
                    <td className="px-4 py-3 text-ink">{r.item.name}</td>
                    <td className="px-4 py-3 text-xs text-ash">{r.item.brand || "—"}</td>
                    <td className="px-4 py-3 text-xs text-ash">{r.item.grade_band.replace("_", "-")}</td>
                    <td className="px-4 py-3 text-xs text-ash">{r.item.cut_type}</td>
                    <td className="px-4 py-3 text-ash">{formatIdr(r.item.sale_price_idr)}</td>
                    <td className="px-4 py-3 text-ink">
                      {formatIdr(publicPrice(r.item.sale_price_idr, r.item.markup_idr))}
                    </td>
                    <td className="px-4 py-3 text-ash">{formatQty(r.item.qty_on_hand_kg)}</td>
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
            {bi(
              "Unggah berkas untuk melihat ringkasan dan pratinjau baris sebelum menyimpan.",
              "Upload a file to see the summary and row preview before saving.",
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-ash">{label}</p>
      <p className="mt-1 text-lg text-ink">{value}</p>
    </div>
  );
}

function StatusTag({ status, mode }: { status: Status; mode: Mode }) {
  const bi = useBi();
  if (status === "duplicate")
    return <span className="text-xs uppercase tracking-[0.14em] text-crimson">{bi("Duplikat", "Duplicate")}</span>;
  if (status === "update")
    return (
      <span className="text-xs uppercase tracking-[0.14em] text-ash">
        {mode === "append" ? bi("Dilewati", "Skipped") : bi("Perbarui", "Update")}
      </span>
    );
  return <span className="text-xs uppercase tracking-[0.14em] text-ink">{bi("Baru", "New")}</span>;
}
