import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, RoleGate } from "@/components/app/app-shell";
import { Field, SelectInput, TextInput } from "@/components/site/form-kit";
import { supabase } from "@/integrations/supabase/client";
import { FEATURED_RANKS, FEATURE_IMAGES } from "@/lib/meatlink/featured";
import {
  CONDITIONS,
  CONDITION_LABEL,
  DEFAULT_LOW_STOCK_KG,
  LOW_STOCK_KEY,
  ORIGINS,
  PAGE_SIZES,
  formatIdr,
  publicPrice,
  defaultMarkup,
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
import { useBi } from "@/lib/i18n";


export const Route = createFileRoute("/_authenticated/admin/inventory/")({
  component: AdminInventoryPage,
  head: () => ({
    meta: [
      { title: "Inventory — Meatlink admin" },
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
      actions={
        <Link to="/admin/inventory/import" className="eyebrow border border-ink/25 px-5 py-3 text-ink">
          {bi("Impor spreadsheet", "Import spreadsheet")}
        </Link>
      }
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
  category: "PRIME_CUT",
  grade_band: "",
  cut_type: "",
  avg_weight_text: "",
  sale_price_idr: "",
  markup_idr: "",
  qty_on_hand_kg: "",
  channels: [...DEFAULT_SALE_CHANNELS] as string[],
  retail_price_idr: "",
  retail_pack_text: "",
};

function InventoryBody() {
  const bi = useBi();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [origin, setOrigin] = useState("");
  const [condition, setCondition] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "not-featured">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [search, origin, condition, featuredFilter, pageSize]);

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

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-inventory", { search, origin, condition, featuredFilter, page, pageSize }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("admin_inventory").select("*", { count: "exact" });
      if (origin) q = q.eq("origin", origin);
      if (condition) q = q.eq("condition", condition);
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

  const pageValue = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.qty_on_hand_kg) * Number(r.sale_price_idr), 0),
    [rows],
  );

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



  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(bi("Nama produk wajib diisi.", "Product name is required."));
      return;
    }
    setPending(true);
    const { error } = await supabase.from("admin_inventory").insert({
      origin: form.origin,
      brand: form.brand.trim(),
      name: form.name.trim(),
      condition: form.condition || null,
      category: form.category as ProductCategory,
      grade_band: (form.grade_band || guessGradeBand(form.name)) as GradeBandValue,
      cut_type: form.cut_type.trim() || guessCutType(form.name),
      avg_weight_text: form.avg_weight_text.trim() || null,
      avg_weight_kg: weightToKg(form.avg_weight_text),
      sale_price_idr: Number(form.sale_price_idr || 0),
      markup_idr: form.markup_idr === "" ? defaultMarkup(form.name, form.brand) : Number(form.markup_idr),
      qty_on_hand_kg: Number(form.qty_on_hand_kg || 0),
      sale_channels: form.channels.length > 0 ? form.channels : DEFAULT_SALE_CHANNELS,
      retail_price_idr: form.retail_price_idr.trim()
        ? Number(form.retail_price_idr.replace(/[^\d.]/g, "")) || null
        : null,
      retail_pack_text: form.retail_pack_text.trim() || null,
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast.success(bi("Item ditambahkan.", "Item added."));
    refresh();
  }

  async function patch(id: string, values: Partial<InventoryItem>) {
    const { error } = await supabase.from("admin_inventory").update(values).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(bi("Inventaris diperbarui.", "Inventory updated."));
      refresh();
    }
  }

  async function setFeatured(item: InventoryItem, rank: number | null) {
    if (rank !== null) {
      const { error: clearError } = await supabase
        .from("admin_inventory")
        .update({ featured_rank: null })
        .eq("featured_rank", rank);
      if (clearError) {
        toast.error(clearError.message);
        return;
      }
    }
    await patch(item.id, {
      featured_rank: rank,
      image_url: rank === null ? null : item.image_url ?? FEATURE_IMAGES[0].key,
    });
  }

  async function remove(item: InventoryItem) {
    if (!window.confirm(bi(`Hapus "${item.name}"?`, `Delete "${item.name}"?`))) return;
    const { error } = await supabase.from("admin_inventory").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else {
      toast.success(bi("Item dihapus.", "Item deleted."));
      refresh();
    }
  }

  return (
    <div className="grid gap-6">
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
          value={condition}
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
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="eyebrow bg-crimson px-5 py-3 text-bone"
        >
          {showForm ? bi("Tutup", "Close") : bi("Tambah item", "Add item")}
        </button>
      </div>


      {showForm ? (
        <Panel className="p-6">
          <form onSubmit={addItem} className="grid gap-4 md:grid-cols-3">
            <Field label={bi("Asal", "Origin")} required>
              <SelectInput
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
              >
                {originOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={bi("Merek", "Brand")}>
              <TextInput value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label={bi("Nama produk", "Product name")} required>
              <TextInput
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label={bi("Kondisi", "Condition")}>
              <SelectInput
                value={form.condition}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              >
                <option value="">{bi("Tidak ditentukan", "Not specified")}</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABEL[c]}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={bi("Kategori", "Category")}>
              <SelectInput
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field
              label={bi("Grade marbling", "Marbling grade")}
              hint={bi("kosongkan untuk deteksi otomatis dari nama", "leave blank to auto-detect from the name")}
            >
              <SelectInput
                value={form.grade_band}
                onChange={(e) => setForm({ ...form, grade_band: e.target.value })}
              >
                <option value="">{bi("Otomatis", "Auto")}</option>
                {GRADE_BAND_VALUES.map((g) => (
                  <option key={g} value={g}>
                    {GRADE_LABEL[g]}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field
              label={bi("Cut", "Cut")}
              hint={bi("kosongkan untuk deteksi otomatis", "leave blank to auto-detect")}
            >
              <TextInput
                value={form.cut_type}
                onChange={(e) => setForm({ ...form, cut_type: e.target.value })}
              />
            </Field>
            <Field label={bi("Berat rata-rata", "Average weight")} hint={bi("contoh: 8KG atau 250GR", "e.g. 8KG or 250GR")}>
              <TextInput
                value={form.avg_weight_text}
                onChange={(e) => setForm({ ...form, avg_weight_text: e.target.value })}
              />
            </Field>
            <Field label={bi("Harga jual (IDR / kg)", "Sale price (IDR / kg)")}>
              <TextInput
                inputMode="numeric"
                value={form.sale_price_idr}
                onChange={(e) => setForm({ ...form, sale_price_idr: e.target.value })}
              />
            </Field>
            <Field label={bi("Markup (IDR / kg)", "Markup (IDR / kg)")}>
              <TextInput
                inputMode="numeric"
                placeholder={String(defaultMarkup(form.name, form.brand))}
                value={form.markup_idr}
                onChange={(e) => setForm({ ...form, markup_idr: e.target.value })}
              />
            </Field>
            <Field label={bi("Jumlah tersedia (kg)", "Quantity on hand (kg)")}>
              <TextInput
                inputMode="decimal"
                value={form.qty_on_hand_kg}
                onChange={(e) => setForm({ ...form, qty_on_hand_kg: e.target.value })}
              />
            </Field>
            <Field
              label={bi("Kanal penjualan", "Sale channels")}
              hint={bi("pilih minimal satu satuan yang boleh dijual", "select at least one sellable unit")}
            >
              <div className="flex flex-wrap gap-2 pt-1.5">
                {SALE_UNITS.map((u) => {
                  const active = form.channels.includes(u);
                  return (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setForm((f) => {
                          const next = active
                            ? f.channels.filter((c) => c !== u)
                            : [...f.channels, u];
                          return { ...f, channels: next.length > 0 ? next : f.channels };
                        })
                      }
                      className={`eyebrow border px-3 py-2 transition-colors ${
                        active
                          ? "border-crimson bg-crimson/10 text-crimson"
                          : "border-line text-ash hover:border-ink/40"
                      }`}
                    >
                      {bi(UNIT_LABEL[u].id, UNIT_LABEL[u].en)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field
              label={bi("Harga ritel (IDR / kg)", "Retail price (IDR / kg)")}
              hint={bi("opsional — kosong berarti ikut harga loaf", "optional — blank follows the loaf price")}
            >
              <TextInput
                inputMode="numeric"
                value={form.retail_price_idr}
                onChange={(e) => setForm({ ...form, retail_price_idr: e.target.value })}
              />
            </Field>
            <Field
              label={bi("Kemasan ritel", "Retail pack")}
              hint={bi("contoh: ±500 g/pack", "e.g. ±500 g/pack")}
            >
              <TextInput
                value={form.retail_pack_text}
                onChange={(e) => setForm({ ...form, retail_pack_text: e.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className="eyebrow w-full bg-crimson px-6 py-4 text-bone disabled:opacity-60"
              >
                {pending ? bi("Menyimpan…", "Saving…") : bi("Simpan item", "Save item")}
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-ash">{bi("Memuat inventaris…", "Loading inventory…")}</p>
      ) : rows.length === 0 ? (
        <Panel className="p-10 text-center text-sm text-ash">{bi("Tidak ada inventaris yang cocok dengan filter ini.", "No inventory matches these filters.")}</Panel>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[1720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.16em] text-ash">
              <tr>
                <th className="px-4 py-3">{bi("Produk", "Product")}</th>
                <th className="px-4 py-3">{bi("Asal", "Origin")}</th>
                <th className="px-4 py-3">{bi("Merek", "Brand")}</th>
                <th className="px-4 py-3">{bi("Kondisi", "Cond.")}</th>
                <th className="px-4 py-3">{bi("Kategori", "Category")}</th>
                <th className="px-4 py-3">{bi("Grade", "Grade")}</th>
                <th className="px-4 py-3">{bi("Cut", "Cut")}</th>
                <th className="px-4 py-3">{bi("Kanal", "Channels")}</th>
                <th className="px-4 py-3">{bi("Berat rata-rata", "Avg wt")}</th>
                <th className="px-4 py-3">{bi("Harga / kg", "Price / kg")}</th>
                <th className="px-4 py-3">{bi("Markup / kg", "Markup / kg")}</th>
                <th className="px-4 py-3">{bi("Harga publik", "Public price")}</th>
                <th className="px-4 py-3">{bi("Promo / kg", "Promo / kg")}</th>
                <th className="px-4 py-3">{bi("Promo sampai", "Promo until")}</th>
                <th className="px-4 py-3">{bi("Jumlah (kg)", "Qty (kg)")}</th>
                <th className="px-4 py-3">{bi("Status", "Status")}</th>
                <th className="px-4 py-3">{bi("Beranda", "Homepage")}</th>

                <th className="px-4 py-3" />
              </tr>


            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {item.name}
                    {!item.is_active ? <span className="ml-2 text-xs text-ash">{bi("(disembunyikan)", "(hidden)")}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-ash">{item.origin}</td>
                  <td className="px-4 py-3 text-xs text-ash">{item.brand || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ash">
                    {item.condition ? CONDITION_LABEL[item.condition] ?? item.condition : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="border border-line bg-transparent px-2 py-1 text-xs text-ink"
                      value={item.category}
                      onChange={(e) =>
                        void patch(item.id, { category: e.target.value as ProductCategory })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="border border-line bg-transparent px-2 py-1 text-xs text-ink"
                      aria-label={`Grade for ${item.name}`}
                      value={item.grade_band}
                      onChange={(e) =>
                        void patch(item.id, { grade_band: e.target.value as GradeBandValue })
                      }
                    >
                      {GRADE_BAND_VALUES.map((g) => (
                        <option key={g} value={g}>
                          {GRADE_LABEL[g]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      defaultValue={item.cut_type ?? ""}
                      aria-label={`Cut for ${item.name}`}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (item.cut_type ?? "")) void patch(item.id, { cut_type: v || null });
                      }}
                      className="w-36 border border-line bg-bone px-2 py-1 text-xs text-ink outline-none focus:border-crimson"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" aria-label={`Kanal penjualan untuk ${item.name}`}>
                      {SALE_UNITS.map((u) => {
                        const channels =
                          item.sale_channels && item.sale_channels.length > 0
                            ? item.sale_channels
                            : DEFAULT_SALE_CHANNELS;
                        const active = channels.includes(u);
                        return (
                          <button
                            key={u}
                            type="button"
                            title={UNIT_LABEL[u].id}
                            aria-pressed={active}
                            onClick={() => {
                              const next = active
                                ? channels.filter((c) => c !== u)
                                : [...channels, u];
                              if (next.length > 0) void patch(item.id, { sale_channels: next });
                              else toast.error(bi("Minimal satu kanal harus aktif.", "At least one channel must stay active."));
                            }}
                            className={`border px-1.5 py-0.5 text-[10px] font-medium ${
                              active
                                ? "border-crimson bg-crimson/10 text-crimson"
                                : "border-line text-ash/50 hover:border-ink/40"
                            }`}
                          >
                            {u === "RETAIL" ? "R" : u === "LOAF" ? "L" : u === "CTN" ? "C" : "T"}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ash">{item.avg_weight_text ?? "—"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="1000"
                      defaultValue={Number(item.sale_price_idr)}
                      aria-label={`Price for ${item.name}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== Number(item.sale_price_idr)) {
                          void patch(item.id, { sale_price_idr: v });
                        }
                      }}
                      className="w-32 border border-line bg-bone px-2 py-1 text-sm text-ink outline-none focus:border-crimson"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="1000"
                      defaultValue={Number(item.markup_idr ?? 0)}
                      aria-label={`Markup for ${item.name}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== Number(item.markup_idr ?? 0)) {
                          void patch(item.id, { markup_idr: v });
                        }
                      }}
                      className="w-28 border border-line bg-bone px-2 py-1 text-sm text-ink outline-none focus:border-crimson"
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-crimson">
                    {formatIdr(publicPrice(item.sale_price_idr, item.markup_idr))}
                    <span className="mt-1 block text-[10px] leading-tight text-ash">
                      R {formatIdr(unitPrice(item.sale_price_idr, item.markup_idr, "retail", margins))}
                      {" · "}L {formatIdr(unitPrice(item.sale_price_idr, item.markup_idr, "loaf", margins))}
                      <br />C {formatIdr(unitPrice(item.sale_price_idr, item.markup_idr, "carton", margins))}
                      {" · "}T {formatIdr(unitPrice(item.sale_price_idr, item.markup_idr, "ton", margins))}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="1000"
                      placeholder="—"
                      defaultValue={item.promo_price_idr ?? ""}
                      aria-label={`Promo price for ${item.name}`}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        const v = raw === "" ? null : Number(raw);
                        if (v !== null && !Number.isFinite(v)) return;
                        if (Number(v ?? -1) !== Number(item.promo_price_idr ?? -1)) {
                          void patch(item.id, { promo_price_idr: v });
                        }
                      }}
                      className="w-32 border border-line bg-bone px-2 py-1 text-sm text-ink outline-none focus:border-crimson"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      defaultValue={item.promo_until ?? ""}
                      aria-label={`Promo end date for ${item.name}`}
                      onBlur={(e) => {
                        const v = e.target.value || null;
                        if (v !== (item.promo_until ?? null)) {
                          void patch(item.id, { promo_until: v });
                        }
                      }}
                      className="w-36 border border-line bg-bone px-2 py-1 text-sm text-ink outline-none focus:border-crimson"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={Number(item.qty_on_hand_kg)}
                      aria-label={`Quantity for ${item.name}`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v !== Number(item.qty_on_hand_kg)) {
                          void patch(item.id, { qty_on_hand_kg: v });
                        }
                      }}
                      className="w-28 border border-line bg-bone px-2 py-1 text-sm text-ink outline-none focus:border-crimson"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {Number(item.qty_on_hand_kg) <= threshold ? (
                      <span className="eyebrow inline-block bg-crimson/10 px-2 py-1 text-crimson">
                        {bi("Restok", "Restock")}
                      </span>
                    ) : (
                      <span className="eyebrow inline-block bg-ink/5 px-2 py-1 text-ash">{bi("Tersedia", "In stock")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={item.featured_rank ?? ""}
                        aria-label={`Featured position for ${item.name}`}
                        onChange={(e) =>
                          void setFeatured(item, e.target.value ? Number(e.target.value) : null)
                        }
                        className="border border-line bg-bone px-2 py-1 text-xs text-ink outline-none focus:border-crimson"
                      >
                        <option value="">{bi("Tidak unggulan", "Not featured")}</option>
                        {FEATURED_RANKS.map((r) => (
                          <option key={r} value={r}>
                            {bi(`Top ${r}`, `Top ${r}`)}
                          </option>
                        ))}
                      </select>
                      {item.featured_rank ? (
                        <select
                          value={item.image_url ?? FEATURE_IMAGES[0].key}
                          aria-label={`Photo for ${item.name}`}
                          onChange={(e) => void patch(item.id, { image_url: e.target.value })}
                          className="border border-line bg-bone px-2 py-1 text-xs text-ink outline-none focus:border-crimson"
                        >
                          {FEATURE_IMAGES.map((img) => (
                            <option key={img.key} value={img.key}>
                              {img.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right">

                    <button
                      type="button"
                      onClick={() => void patch(item.id, { is_active: !item.is_active })}
                      className="text-xs text-ash underline underline-offset-4"
                    >
                      {item.is_active ? bi("Sembunyikan", "Hide") : bi("Tampilkan", "Show")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(item)}
                      className="ml-3 text-xs text-crimson underline underline-offset-4"
                    >
                      {bi("Hapus", "Delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
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
