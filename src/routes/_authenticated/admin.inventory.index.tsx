import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { Field, SelectInput, TextInput } from "@/components/site/form-kit";
import { supabase } from "@/integrations/supabase/client";
import { FEATURED_RANKS, resolveProductImage } from "@/lib/meatlink/featured";
import { Button } from "@/components/ui/button";
import { Download, Plus, Pencil, Upload, Archive } from "lucide-react";
import * as XLSX from "xlsx";
import { uploadInventoryImage } from "@/lib/meatlink/inventory-image.functions";
import {
  CONDITIONS,
  CONDITION_LABEL,
  DEFAULT_LOW_STOCK_KG,
  LOW_STOCK_KEY,
  ORIGINS,
  PAGE_SIZES,
  formatIdr,
  publicPrice,
  unitPrice,
  defaultMarkup,
  guessCategory,
  IMPORT_COLUMNS,
  weightToKg,
  type InventoryItem,
  GRADE_BAND_VALUES,
  guessGradeBand,
  guessCutType,
  DEFAULT_SALE_CHANNELS,
  type GradeBandValue,
} from "@/lib/meatlink/inventory";
import { CATEGORIES, GRADE_LABEL, type ProductCategory } from "@/lib/meatlink/catalog";
import { SALE_UNITS, UNIT_LABEL } from "@/lib/meatlink/shop-mode";
import { useUnitMargins } from "@/lib/meatlink/unit-margins";
import { useBi } from "@/lib/i18n";


export const Route = createFileRoute("/_authenticated/admin/inventory/")({
  component: AdminInventoryPage,
  head: () => ({
    meta: [
      { title: "Inventaris — Meatlink admin" },
      { property: "og:title", content: "Inventaris — Meatlink admin" },
      { property: "og:description", content: "Kelola stok, harga, dan foto produk Meatlink." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content: "Manage the Meatlink house inventory: origins, brands, prices and stock on hand.",
      },
    ],
  }),
});

function AdminInventoryPage() {
  const bi = useBi();
  return (
    <AppShell
      title={bi("Inventaris Meatlink", "Meatlink inventory")}
      intro={bi(
        "Daftar stok kami sendiri — asal, merek, harga jual, dan jumlah yang tersedia.",
        "Our own stock list — origins, brands, sale prices and quantities on hand.",
      )}

    >
      <RoleGate allow="admin">
        <InventoryBody />
      </RoleGate>
    </AppShell>
  );
}

const EMPTY_FORM = {
  origin: "Australia",
  brand: "",
  name: "",
  condition: "FRZ",
  category: "",
  grade_band: "",
  cut_type: "",
  avg_weight_text: "",
  sale_price_idr: "",
  markup_idr: "",
  qty_on_hand_kg: "",
  channels: [...DEFAULT_SALE_CHANNELS] as string[],
  retail_price_idr: "",
  retail_pack_text: "",
  promo_price_idr: "",
  promo_until: "",
  featured_rank: "",
};

function InventoryBody() {
  const margins = useUnitMargins();
  const bi = useBi();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("");
  const [channel, setChannel] = useState<string>("");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "not-featured">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [step, setStep] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [search, origin, brand, condition, channel, featuredFilter, pageSize]);

  const { data: threshold = DEFAULT_LOW_STOCK_KG } = useQuery({
    queryKey: ["admin-settings", LOW_STOCK_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", LOW_STOCK_KEY)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.value ?? DEFAULT_LOW_STOCK_KG);
    },
  });

  const { data: origins } = useQuery({
    queryKey: ["admin-inventory-origins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_inventory").select("origin");
      if (error) throw error;
      return (data ?? []).map((d) => d.origin as string);
    },
  });

  const { data: brands } = useQuery({
    queryKey: ["admin-inventory-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_inventory")
        .select("brand")
        .not("brand", "is", null);
      if (error) throw error;
      return [...new Set((data ?? []).map((d) => d.brand as string).filter(Boolean))].sort();
    },
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-inventory", { search, origin, brand, condition, channel, featuredFilter, page, pageSize }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("admin_inventory").select("*", { count: "exact" });
      if (origin) q = q.eq("origin", origin);
      if (brand) q = q.eq("brand", brand);
      if (condition) q = q.eq("condition", condition);
      if (channel) q = q.contains("sale_channels", [channel]);
      if (featuredFilter === "featured") q = q.not("featured_rank", "is", null);
      if (featuredFilter === "not-featured") q = q.is("featured_rank", null);
      if (search) {
        const term = search.replace(/[%,]/g, " ");
        q = q.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
      }
      const from = (page - 1) * pageSize;
      const { data, error, count } = await q
        .order("origin")
        .order("name")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as InventoryItem[], count: count ?? 0 };
    },
  });

  const { data: lowCount = 0 } = useQuery({
    queryKey: ["admin-inventory-low", threshold],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("admin_inventory")
        .select("id", { count: "exact", head: true })
        .lte("qty_on_hand_kg", threshold);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: totalValue = 0 } = useQuery({
    queryKey: ["admin-inventory-total-value"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_inventory")
        .select("qty_on_hand_kg, sale_price_idr");
      if (error) throw error;
      return (data ?? []).reduce(
        (sum, r) => sum + Number(r.qty_on_hand_kg) * Number(r.sale_price_idr),
        0,
      );
    },
  });

  const rows = result?.rows ?? [];
  const total = result?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));


  const originOptions = useMemo(() => {
    const set = new Set<string>([...ORIGINS, ...(origins ?? [])]);
    return [...set].sort();
  }, [origins]);

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["admin-inventory"] });
    void qc.invalidateQueries({ queryKey: ["admin-inventory-low"] });
    void qc.invalidateQueries({ queryKey: ["admin-inventory-total-value"] });
    void qc.invalidateQueries({ queryKey: ["featured-inventory"] });
  }

  const uploadImage = useServerFn(uploadInventoryImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  function pickPhoto(itemId: string) {
    uploadTargetRef.current = itemId;
    fileInputRef.current?.click();
  }

  async function onPhotoChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const itemId = uploadTargetRef.current;
    uploadTargetRef.current = null;
    if (!file || !itemId) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(bi("Format gambar harus JPG, PNG, atau WEBP.", "Image must be JPG, PNG, or WEBP."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(bi("Ukuran gambar maksimal 5 MB.", "Image must be 5 MB or smaller."));
      return;
    }
    setUploadingId(itemId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      await uploadImage({ data: { itemId, contentType: file.type, data: base64 } });
      toast.success(bi("Foto produk diperbarui.", "Product photo updated."));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : bi("Gagal mengunggah foto.", "Upload failed."));
    } finally {
      setUploadingId(null);
    }
  }



  function openEditor(item?: InventoryItem) {
    setEditing(item ?? null);
    setForm(item ? {
      origin: item.origin, brand: item.brand ?? "", name: item.name,
      condition: item.condition ?? "", category: item.category,
      grade_band: item.grade_band ?? "", cut_type: item.cut_type ?? "",
      avg_weight_text: item.avg_weight_text ?? "", sale_price_idr: String(item.sale_price_idr),
      markup_idr: String(item.markup_idr ?? 0), qty_on_hand_kg: String(item.qty_on_hand_kg),
      channels: item.sale_channels?.length ? [...item.sale_channels] : [...DEFAULT_SALE_CHANNELS],
      retail_price_idr: item.retail_price_idr == null ? "" : String(item.retail_price_idr),
      retail_pack_text: item.retail_pack_text ?? "",
      promo_price_idr: item.promo_price_idr == null ? "" : String(item.promo_price_idr),
      promo_until: item.promo_until ?? "",
      featured_rank: item.featured_rank == null ? "" : String(item.featured_rank),
    } : { ...EMPTY_FORM, channels: [...DEFAULT_SALE_CHANNELS] });
    setStep(0);
    setShowForm(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (step === 0 && (!form.name.trim() || !form.brand.trim() || !form.origin.trim())) {
      toast.error(bi("Isi nama, merek, dan asal produk.", "Enter product name, brand and origin.")); return;
    }
    if (step === 1 && (form.sale_price_idr.trim() === "" || form.qty_on_hand_kg.trim() === "" || Number(form.sale_price_idr) < 0 || Number(form.qty_on_hand_kg) < 0)) {
      toast.error(bi("Isi harga dan stok dengan angka yang valid.", "Enter valid price and stock.")); return;
    }
    if (step === 2 && form.channels.length === 0) { toast.error(bi("Pilih minimal satu kanal.", "Select at least one channel.")); return; }
    if (step < 3) { setStep(step + 1); return; }
    const price = Number(form.sale_price_idr), qty = Number(form.qty_on_hand_kg);
    const markup = form.markup_idr === "" ? defaultMarkup(form.name, form.brand) : Number(form.markup_idr);
    const retail = form.retail_price_idr === "" ? null : Number(form.retail_price_idr);
    const promo = form.promo_price_idr === "" ? null : Number(form.promo_price_idr);
    if (!form.name.trim() || !form.brand.trim() || !Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty < 0 || !Number.isFinite(markup) || markup < 0 || (retail !== null && (!Number.isFinite(retail) || retail < 0)) || (promo !== null && (!Number.isFinite(promo) || promo < 0)) || form.channels.length === 0) {
      toast.error(bi("Periksa nama, merek, harga, stok, dan kanal penjualan.", "Check name, brand, price, stock and sale channels."));
      return;
    }
    setPending(true);
    const values = {
      origin: form.origin, brand: form.brand.trim(), name: form.name.trim(),
      condition: form.condition || null,
      category: (form.category || guessCategory(form.name)) as ProductCategory,
      grade_band: (form.grade_band || guessGradeBand(form.name)) as GradeBandValue,
      cut_type: form.cut_type.trim() || guessCutType(form.name),
      avg_weight_text: form.avg_weight_text.trim() || null,
      avg_weight_kg: weightToKg(form.avg_weight_text), sale_price_idr: price,
      markup_idr: markup, qty_on_hand_kg: qty, sale_channels: form.channels,
      retail_price_idr: retail, retail_pack_text: form.retail_pack_text.trim() || null,
      promo_price_idr: promo, promo_until: form.promo_until || null,
      featured_rank: form.featured_rank === "" ? null : Number(form.featured_rank),
    };
    const { error } = editing
      ? await supabase.from("admin_inventory").update(values).eq("id", editing.id)
      : await supabase.from("admin_inventory").insert(values);
    setPending(false);
    if (error) { toast.error(error.message); return; }
    setShowForm(false);
    setEditing(null);
    toast.success(bi("Produk tersimpan.", "Product saved."));
    refresh();
    void qc.invalidateQueries({ queryKey: ["admin-inventory-brands"] });
    void qc.invalidateQueries({ queryKey: ["admin-inventory-origins"] });
  }

  async function exportInventory() {
    setExporting(true);
    try {
      const all: InventoryItem[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from("admin_inventory").select("*").order("id").range(offset, offset + 499);
        if (error) throw error;
        all.push(...((data ?? []) as InventoryItem[]));
        if ((data ?? []).length < 500) break;
      }
      const records = all.map((item) => ({
        ...Object.fromEntries(IMPORT_COLUMNS.map((key) => [key, key === "avg_weight" ? item.avg_weight_text ?? "" : key === "sale_channels" ? item.sale_channels?.join(",") ?? "" : item[key as keyof InventoryItem] ?? ""])),
        status: item.is_active ? "Aktif" : "Arsip", slug: item.slug ?? "",
      }));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(records), "Inventori");
      XLSX.writeFile(book, `meatlink-inventori-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(bi(`${all.length} produk diunduh.`, `${all.length} products downloaded.`));
    } catch (err) { toast.error(err instanceof Error ? err.message : bi("Gagal mengunduh daftar.", "Download failed.")); }
    finally { setExporting(false); }
  }

  async function patch(id: string, values: Partial<InventoryItem>) {
    const { error } = await supabase.from("admin_inventory").update(values).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(bi("Inventaris diperbarui.", "Inventory updated."));
      refresh();
    }
  }

  async function archive(item: InventoryItem) {
    if (!window.confirm(bi(`Arsipkan "${item.name}"? Produk disembunyikan, harga khusus pelanggan tetap tersimpan.`, `Archive "${item.name}"? It will be hidden; customer prices remain saved.`))) return;
    await patch(item.id, { is_active: false, is_published: false, featured_rank: null });
    setShowForm(false);
  }

  const pageValue = rows.reduce((sum, item) => sum + Number(item.qty_on_hand_kg) * Number(item.sale_price_idr), 0);

  return (
    <div className="grid gap-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => void onPhotoChosen(e)}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={bi("SKU (difilter)", "SKUs (filtered)")} value={String(total)} />
        <Stat label={bi(`Perlu restock (≤ ${threshold} kg)`, `Needs restock (≤ ${threshold} kg)`)} value={String(lowCount)} />
        <Stat label={bi("Nilai stok halaman ini", "Page stock value")} value={formatIdr(pageValue)} />
        <Stat label={bi("Total nilai stok", "Total stock value")} value={formatIdr(totalValue)} />
      </div>


      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={bi("Cari produk atau merek", "Search product or brand")}
          aria-label={bi("Cari inventaris", "Search inventory")}
          className="min-w-[220px] flex-1 border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        />
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          aria-label={bi("Filter berdasarkan asal", "Filter by origin")}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">{bi("Semua asal", "All origins")}</option>
          {originOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          aria-label={bi("Filter berdasarkan merek", "Filter by brand")}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">{bi("Semua merek", "All brands")}</option>
          {(brands ?? []).map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          onChange={(e) => setCondition(e.target.value)}
          aria-label={bi("Filter berdasarkan kondisi", "Filter by condition")}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">{bi("Semua kondisi", "All conditions")}</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABEL[c]}
            </option>
          ))}
        </select>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          aria-label={bi("Filter berdasarkan kanal", "Filter by channel")}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="">{bi("Semua kanal", "All channels")}</option>
          {SALE_UNITS.map((u) => (
            <option key={u} value={u}>
              {bi(UNIT_LABEL[u].id, UNIT_LABEL[u].en)}
            </option>
          ))}
        </select>
        <select
          value={featuredFilter}
          onChange={(e) => setFeaturedFilter(e.target.value as typeof featuredFilter)}
          aria-label={bi("Filter berdasarkan status unggulan", "Filter by featured status")}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          <option value="all">{bi("Semua item", "All items")}</option>
          <option value="featured">{bi("Hanya unggulan", "Featured only")}</option>
          <option value="not-featured">{bi("Tidak unggulan", "Not featured")}</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          aria-label={bi("Baris per halaman", "Rows per page")}
          className="border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-crimson"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} / {bi("hal", "page")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button onClick={() => openEditor()}><Plus />{bi("Tambah produk", "Add product")}</Button>
        <Button variant="outline" onClick={() => void exportInventory()} disabled={exporting}><Download />{exporting ? bi("Menyiapkan…", "Preparing…") : bi("Unduh daftar inventori", "Download inventory list")}</Button>
        <Button variant="outline" asChild><Link to="/admin/inventory/import"><Upload />{bi("Tambah dari Excel", "Add from Excel")}</Link></Button>
      </div>


      {showForm ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink/50" onMouseDown={(e) => { if (e.target === e.currentTarget && !pending) setShowForm(false); }}>
          <section role="dialog" aria-modal="true" aria-label={editing ? bi("Edit produk", "Edit product") : bi("Tambah produk", "Add product")} className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-bone shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-8">
              <div><p className="eyebrow text-crimson">{bi(`Langkah ${step + 1} dari 4`, `Step ${step + 1} of 4`)}</p><h2 className="mt-1 font-display text-2xl text-ink">{editing ? bi("Edit produk", "Edit product") : bi("Tambah produk", "Add product")}</h2></div>
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)} aria-label={bi("Tutup", "Close")}>✕</Button>
            </div>
            <form onSubmit={(e) => void saveItem(e)} className="flex min-h-0 flex-1 flex-col" noValidate>
              <div className="flex-1 overflow-y-auto px-5 py-7 sm:px-8">
                {step === 0 ? <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={bi("Nama produk", "Product name")} required><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                  <Field label={bi("Merek", "Brand")} required><TextInput value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
                  <Field label={bi("Asal", "Origin")} required><SelectInput value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })}>{originOptions.map((o) => <option key={o} value={o}>{o}</option>)}</SelectInput></Field>
                  <Field label={bi("Kondisi", "Condition")}><SelectInput value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}><option value="">—</option>{CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}</SelectInput></Field>
                  <Field label={bi("Kategori", "Category")}><SelectInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">{bi("Deteksi dari nama", "Detect from name")}</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</SelectInput></Field>
                  <Field label="Grade"><SelectInput value={form.grade_band} onChange={(e) => setForm({ ...form, grade_band: e.target.value })}><option value="">{bi("Deteksi dari nama", "Detect from name")}</option>{GRADE_BAND_VALUES.map((g) => <option key={g} value={g}>{GRADE_LABEL[g]}</option>)}</SelectInput></Field>
                  <Field label={bi("Potongan", "Cut")}><TextInput value={form.cut_type} placeholder={guessCutType(form.name)} onChange={(e) => setForm({ ...form, cut_type: e.target.value })} /></Field>
                  <Field label={bi("Berat rata-rata", "Average weight")} hint={bi("Misalnya 8KG atau 250GR", "For example 8KG or 250GR")}><TextInput value={form.avg_weight_text} onChange={(e) => setForm({ ...form, avg_weight_text: e.target.value })} /></Field>
                  {editing ? <div className="sm:col-span-2"><Button variant="outline" type="button" onClick={() => pickPhoto(editing.id)} disabled={uploadingId === editing.id}><Upload />{uploadingId === editing.id ? bi("Mengunggah…", "Uploading…") : bi("Unggah foto produk", "Upload product photo")}</Button></div> : <p className="text-sm text-ash sm:col-span-2">{bi("Setelah produk disimpan, foto dapat diunggah dari layar edit.", "After saving, upload a photo from the edit screen.")}</p>}
                </div> : null}
                {step === 1 ? <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={bi("Harga dasar / kg (Rp)", "Base price / kg (Rp)")} required><TextInput type="number" min="0" value={form.sale_price_idr} onChange={(e) => setForm({ ...form, sale_price_idr: e.target.value })} /></Field>
                  <Field label={bi("Stok tersedia (kg)", "Available stock (kg)")} required><TextInput type="number" min="0" step="0.01" value={form.qty_on_hand_kg} onChange={(e) => setForm({ ...form, qty_on_hand_kg: e.target.value })} /></Field>
                  <Field label={bi("Markup / kg (Rp)", "Markup / kg (Rp)")} hint={bi("Kosong = otomatis sesuai jenis produk", "Blank = automatic by product type")}><TextInput type="number" min="0" placeholder={String(defaultMarkup(form.name, form.brand))} value={form.markup_idr} onChange={(e) => setForm({ ...form, markup_idr: e.target.value })} /></Field>
                  <Field label={bi("Harga ritel khusus / kg (Rp)", "Special retail price / kg (Rp)")}><TextInput type="number" min="0" value={form.retail_price_idr} onChange={(e) => setForm({ ...form, retail_price_idr: e.target.value })} /></Field>
                  <Field label={bi("Kemasan ritel", "Retail pack")}><TextInput value={form.retail_pack_text} onChange={(e) => setForm({ ...form, retail_pack_text: e.target.value })} /></Field>
                  <Field label={bi("Harga promo / kg (Rp)", "Promo price / kg (Rp)")}><TextInput type="number" min="0" value={form.promo_price_idr} onChange={(e) => setForm({ ...form, promo_price_idr: e.target.value })} /></Field>
                  <Field label={bi("Promo hingga", "Promo until")}><TextInput type="date" value={form.promo_until} onChange={(e) => setForm({ ...form, promo_until: e.target.value })} /></Field>
                  <div className="border-t border-line pt-5 sm:col-span-2"><p className="eyebrow text-ash">{bi("Perkiraan harga tampil / kg", "Preview customer price / kg")}</p><p className="mt-2 font-display text-3xl text-crimson">{formatIdr(publicPrice(form.sale_price_idr, form.markup_idr === "" ? defaultMarkup(form.name, form.brand) : form.markup_idr))}</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm text-ash">{SALE_UNITS.map((u) => <p key={u}>{bi(UNIT_LABEL[u].id, UNIT_LABEL[u].en)}: {formatIdr(unitPrice(form.sale_price_idr, form.markup_idr === "" ? defaultMarkup(form.name, form.brand) : form.markup_idr, u === "RETAIL" ? "retail" : u === "LOAF" ? "loaf" : u === "CTN" ? "carton" : "ton", margins))}</p>)}</div></div>
                </div> : null}
                {step === 2 ? <div><h3 className="font-display text-xl text-ink">{bi("Kanal penjualan", "Sale channels")}</h3><div className="mt-5 grid gap-3 sm:grid-cols-2">{SALE_UNITS.map((u) => <label key={u} className="flex items-center gap-3 border border-line bg-card p-4 text-sm text-ink"><input type="checkbox" checked={form.channels.includes(u)} onChange={(e) => setForm((f) => ({ ...f, channels: e.target.checked ? [...f.channels, u] : f.channels.filter((c) => c !== u) }))} />{bi(UNIT_LABEL[u].id, UNIT_LABEL[u].en)}</label>)}</div><p className="mt-4 text-sm text-ash">{bi("Pilih minimal satu kanal.", "Select at least one channel.")}</p><Field label={bi("Posisi unggulan di beranda", "Homepage featured position")}><SelectInput value={form.featured_rank} onChange={(e) => setForm({ ...form, featured_rank: e.target.value })}><option value="">{bi("Tidak ditampilkan", "Not featured")}</option>{FEATURED_RANKS.map((rank) => <option key={rank} value={rank}>{rank}</option>)}</SelectInput></Field>{editing ? <div className="mt-7 border-t border-line pt-5"><Button type="button" variant="outline" onClick={() => void patch(editing.id, { is_active: !editing.is_active, is_published: !editing.is_active }).then(() => setShowForm(false))}>{editing.is_active ? bi("Sembunyikan sementara", "Hide temporarily") : bi("Aktifkan kembali", "Reactivate")}</Button><Button type="button" variant="ghost" onClick={() => void archive(editing)}><Archive />{bi("Arsipkan produk", "Archive product")}</Button></div> : null}</div> : null}
                {step === 3 ? <div className="space-y-5 text-sm text-ink"><h3 className="font-display text-xl">{bi("Tinjau sebelum menyimpan", "Review before saving")}</h3><div className="grid grid-cols-2 gap-4 border-y border-line py-5"><span>{bi("Produk", "Product")}</span><strong className="break-words text-right">{form.name || "—"}</strong><span>{bi("Merek", "Brand")}</span><strong className="text-right">{form.brand || "—"}</strong><span>{bi("Stok", "Stock")}</span><strong className="text-right">{form.qty_on_hand_kg || "0"} kg</strong><span>{bi("Harga pelanggan / kg", "Customer price / kg")}</span><strong className="text-right">{formatIdr(publicPrice(form.sale_price_idr, form.markup_idr === "" ? defaultMarkup(form.name, form.brand) : form.markup_idr))}</strong><span>{bi("Kanal", "Channels")}</span><strong className="text-right">{form.channels.join(", ") || "—"}</strong></div></div> : null}
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line bg-card px-5 py-5 sm:px-8"><Button type="button" variant="outline" disabled={step === 0 || pending} onClick={() => setStep(step - 1)}>{bi("Kembali", "Back")}</Button><Button type="submit" disabled={pending}>{pending ? bi("Menyimpan…", "Saving…") : step === 3 ? bi("Simpan produk", "Save product") : bi("Lanjut", "Continue")}</Button></div>
            </form>
          </section>
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-ash">{bi("Memuat inventaris…", "Loading inventory…")}</p> : rows.length === 0 ? <p className="border-t border-line py-12 text-center text-sm text-ash">{bi("Tidak ada produk yang cocok.", "No matching products.")}</p> : (
        <div className="border-y border-line bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_150px_100px_90px] gap-4 border-b border-line px-4 py-3 text-xs uppercase text-ash md:grid"><span>{bi("Produk", "Product")}</span><span>{bi("Stok", "Stock")}</span><span>{bi("Harga / kg", "Price / kg")}</span><span>Status</span><span></span></div>
          {rows.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-4 border-b border-line px-4 py-4 last:border-0 md:grid md:grid-cols-[minmax(0,1fr)_110px_150px_100px_90px]">
            <div className="flex min-w-0 flex-[1_1_220px] items-center gap-3"><img className="h-14 w-14 shrink-0 object-cover" src={resolveProductImage(item.image_url, item.name, item.category, item.grade_band, item.cut_type, item.id)} alt="" /><div className="min-w-0"><p className="break-words font-medium text-ink">{item.name}</p><p className="text-xs text-ash">{item.brand || "—"} · {item.origin}</p></div></div>
            <p className="min-w-[80px] text-sm text-ink md:min-w-0">{Number(item.qty_on_hand_kg).toLocaleString("id-ID")} kg</p><p className="min-w-[110px] text-sm font-semibold text-ink md:min-w-0">{formatIdr(publicPrice(item.sale_price_idr, item.markup_idr))}</p><span className={`text-xs ${item.is_active ? "text-ink" : "text-ash"}`}>{item.is_active ? bi("Aktif", "Active") : bi("Arsip", "Archived")}</span>
            <Button variant="outline" size="sm" onClick={() => openEditor(item)} aria-label={`${bi("Edit", "Edit")} ${item.name}`}><Pencil />{bi("Edit", "Edit")}</Button>
          </div>)}
        </div>
      )}

      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ash">
          <p>
            {bi(
              `Menampilkan ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} dari ${total} item`,
              `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} items`,
            )}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="eyebrow border border-line px-4 py-2 text-ink disabled:opacity-40"
            >
              {bi("Sebelumnya", "Previous")}
            </button>
            <span>
              {bi(`Halaman ${page} / ${pageCount}`, `Page ${page} / ${pageCount}`)}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="eyebrow border border-line px-4 py-2 text-ink disabled:opacity-40"
            >
              {bi("Berikutnya", "Next")}
            </button>
          </div>
        </div>
      ) : null}
    </div>

  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Panel className="p-5">
      <p className="eyebrow text-ash">{label}</p>
      <p className="mt-2 font-display text-2xl text-ink">{value}</p>
    </Panel>
  );
}
