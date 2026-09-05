import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/site-layout";
import { Recommendations } from "@/components/meatlink/recommendations";
import { ProductCard } from "@/components/site/product-card";
import {
  AVAILABILITY_LABEL,
  CATEGORIES,
  SORT_OPTIONS,
  useCatalog,
  useCatalogFacets,
  type Availability,
  type CatalogSort,
  type FacetValue,
  type ProductCategory,
  GRADE_BANDS,
  gradeLabel,
} from "@/lib/meatlink/catalog";
import { SALE_UNITS, UNIT_LABEL, setShopMode, type SaleUnit, type ShopMode } from "@/lib/meatlink/shop-mode";

const GRADE_ORDER = GRADE_BANDS as readonly string[];

type CatalogSearchParams = {
  q?: string;
  category?: ProductCategory;
  origin?: string[];
  brand?: string[];
  condition?: string[];
  avail?: string[];
  grade?: string[];
  cut?: string[];
  unit?: string[];
  min?: number;
  max?: number;
  sort?: CatalogSort;
  page?: number;
};

const SORT_VALUES = SORT_OPTIONS.map((s) => s.value) as string[];

function toStringArray(raw: unknown): string[] | undefined {
  const arr = Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : [];
  const clean = arr.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  return clean.length ? clean.slice(0, 30) : undefined;
}

function toNumber(raw: unknown): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export const Route = createFileRoute("/produk/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearchParams => {
    const q = typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined;
    const category = CATEGORIES.find((c) => c.value === search.category)?.value;
    const sortRaw = typeof search.sort === "string" ? search.sort : "";
    const sort = SORT_VALUES.includes(sortRaw) ? (sortRaw as CatalogSort) : undefined;
    const page = toNumber(search.page);
    return {
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
      ...(toStringArray(search.origin) ? { origin: toStringArray(search.origin) } : {}),
      ...(toStringArray(search.brand) ? { brand: toStringArray(search.brand) } : {}),
      ...(toStringArray(search.condition) ? { condition: toStringArray(search.condition) } : {}),
      ...(toStringArray(search.avail) ? { avail: toStringArray(search.avail) } : {}),
      ...(toStringArray(search.grade) ? { grade: toStringArray(search.grade) } : {}),
      ...(toStringArray(search.cut) ? { cut: toStringArray(search.cut) } : {}),
      ...(() => {
        const units = (toStringArray(search.unit) ?? []).filter((u) =>
          (SALE_UNITS as readonly string[]).includes(u.toUpperCase()),
        ).map((u) => u.toUpperCase());
        return units.length ? { unit: units } : {};
      })(),
      ...(toNumber(search.min) ? { min: toNumber(search.min) } : {}),
      ...(toNumber(search.max) ? { max: toNumber(search.max) } : {}),
      ...(sort ? { sort } : {}),
      ...(page && page > 1 ? { page: Math.min(999, Math.round(page)) } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Katalog Produk Daging B2B — Meatlink.id" },
      {
        name: "description",
        content:
          "Jelajahi katalog daging B2B Meatlink.id: filter berdasarkan asal negara, brand, kondisi, harga dan ketersediaan stok.",
      },
      { property: "og:title", content: "Katalog Produk Daging B2B — Meatlink.id" },
      {
        property: "og:description",
        content:
          "Prime cut, second cut, offal dan bone dari importir terverifikasi. Filter asal, brand, kondisi, harga dan stok.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://meatlink.id/produk" }],
  }),
  component: CatalogPage,
});

const PAGE_SIZE = 24;

const MODE_TABS: { id: "all" | "retail" | "bulk"; label: string; units: SaleUnit[]; mode?: ShopMode }[] = [
  { id: "all", label: "Semua", units: [] },
  { id: "retail", label: "Ritel", units: ["RETAIL"], mode: "retail" },
  { id: "bulk", label: "Grosir / B2B", units: ["LOAF", "CTN", "TON"], mode: "bulk" },
];

const CONDITION_LABEL: Record<string, string> = { FRZ: "Frozen (FRZ)", CHL: "Chilled (CHL)" };

const rupiah = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));

function CatalogPage() {
  const params = Route.useSearch();
  const navigate = useNavigate({ from: "/produk/" });
  const [searchInput, setSearchInput] = useState(params.q ?? "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setSearchInput(params.q ?? "");
  }, [params.q]);

  const page = params.page ?? 1;
  const sort = params.sort ?? "featured";
  const category = params.category ?? null;
  const selectedUnits = params.unit ?? [];
  const modeTabId: "all" | "retail" | "bulk" =
    selectedUnits.length === 0
      ? "all"
      : selectedUnits.every((u) => u === "RETAIL")
        ? "retail"
        : selectedUnits.every((u) => u !== "RETAIL")
          ? "bulk"
          : "all";

  const setSearchParams = (
    patch: Partial<CatalogSearchParams>,
    resetPage = true,
    scrollToTop = false,
  ) => {
    void navigate({
      // Filtering must not yank the page back to the top — the shopper is
      // usually below the filter bar when toggling chips on mobile.
      // Pagination is the exception: jumping pages returns to the grid top.
      resetScroll: scrollToTop,
      search: (prev) => {
        const next = { ...prev, ...patch } as CatalogSearchParams;
        if (resetPage) delete next.page;
        (Object.keys(next) as (keyof CatalogSearchParams)[]).forEach((k) => {
          const v = next[k];
          if (v === undefined || v === null || (Array.isArray(v) && v.length === 0) || v === "") {
            delete next[k];
          }
        });
        return next;
      },
    });
  };

  const toggleValue = (
    key: "origin" | "brand" | "condition" | "avail" | "grade" | "cut" | "unit",
    value: string,
  ) => {
    const current = params[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setSearchParams({ [key]: next } as Partial<CatalogSearchParams>);
  };

  const { data: facets } = useCatalogFacets({ search: params.q ?? "", category });
  // Category chip counts must stay scoped to the search term only, never to the
  // currently selected category, so the tabs reflect the same Prime/Second rules.
  const { data: categoryFacets } = useCatalogFacets({ search: params.q ?? "", category: null });
  const categoryCounts = new Map(
    (categoryFacets?.categories ?? []).map((f) => [f.value, f.count] as const),
  );

  const { data, isLoading, isError } = useCatalog({
    search: params.q ?? "",
    category,
    origins: params.origin ?? [],
    brands: params.brand ?? [],
    conditions: params.condition ?? [],
    availability: params.avail ?? [],
    grades: params.grade ?? [],
    cuts: params.cut ?? [],
    units: params.unit ?? [],
    minPrice: params.min ?? null,
    maxPrice: params.max ?? null,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeChips: { label: string; onRemove: () => void }[] = [
    ...(category
      ? [
          {
            label: CATEGORIES.find((c) => c.value === category)?.label ?? category,
            onRemove: () => setSearchParams({ category: undefined }),
          },
        ]
      : []),
    ...(params.origin ?? []).map((v) => ({ label: v, onRemove: () => toggleValue("origin", v) })),

    ...(params.brand ?? []).map((v) => ({ label: v, onRemove: () => toggleValue("brand", v) })),
    ...(params.condition ?? []).map((v) => ({
      label: CONDITION_LABEL[v] ?? v,
      onRemove: () => toggleValue("condition", v),
    })),
    ...(params.avail ?? []).map((v) => ({
      label: AVAILABILITY_LABEL[v as Availability] ?? v,
      onRemove: () => toggleValue("avail", v),
    })),
    ...(params.grade ?? []).map((v) => ({
      label: gradeLabel(v) ?? v,
      onRemove: () => toggleValue("grade", v),
    })),
    ...(params.cut ?? []).map((v) => ({ label: v, onRemove: () => toggleValue("cut", v) })),
    ...(params.unit ?? []).map((v) => ({
      label: UNIT_LABEL[v as SaleUnit]?.id ?? v,
      onRemove: () => toggleValue("unit", v),
    })),
    ...(params.min || params.max
      ? [
          {
            label: `Rp ${rupiah(params.min ?? 0)} – ${params.max ? `Rp ${rupiah(params.max)}` : "∞"}`,
            onRemove: () => setSearchParams({ min: undefined, max: undefined }),
          },
        ]
      : []),
  ];

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Katalog"
        title={
          <>
            Daging siap pesan,
            <br />
            <span className="italic text-bone/85">harga transparan.</span>
          </>
        }
        intro="Semua produk bersumber dari importir dan pemasok terverifikasi. Harga ditampilkan per kilogram dan sudah termasuk layanan Meatlink."
      />

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <h2 className="mb-6 font-display text-2xl sm:text-3xl">Semua produk</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchParams({ q: searchInput.trim().slice(0, 100) || undefined });
          }}
          className="flex flex-col gap-3 sm:flex-row"
          role="search"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari produk, brand atau asal negara…"
              aria-label="Cari produk"
              className="w-full border border-line bg-background py-3 pl-11 pr-4 text-sm text-ink outline-none focus:border-ink"
            />
          </div>
          <button
            type="submit"
            className="eyebrow bg-crimson px-6 py-3 text-bone transition-colors hover:bg-crimson-deep"
          >
            Cari
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1 text-ash">Cara beli</span>
          {MODE_TABS.map((tab) => (
            <FilterChip
              key={tab.id}
              active={modeTabId === tab.id}
              onClick={() => {
                setSearchParams({ unit: tab.units.length ? [...tab.units] : undefined });
                if (tab.mode) setShopMode(tab.mode);
              }}
            >
              {tab.label}
            </FilterChip>
          ))}
        </div>
        <p className="mt-2 text-xs text-ash">
          {modeTabId === "retail"
            ? "Produk yang tersedia dalam kemasan kecil untuk pembelian pribadi atau sampel."
            : modeTabId === "bulk"
              ? "Produk untuk pembelian bisnis: loaf, karton hingga tonase."
              : "Semua produk ditampilkan — pilih Ritel atau Grosir untuk menyaring sesuai kebutuhan."}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <FilterChip active={category === null} onClick={() => setSearchParams({ category: undefined })}>
            Semua
            {categoryFacets ? ` (${[...categoryCounts.values()].reduce((a, b) => a + b, 0)})` : ""}
          </FilterChip>
          {CATEGORIES.map((c) => {
            const count = categoryCounts.get(c.value) ?? 0;
            const empty = Boolean(categoryFacets) && count === 0;
            return (
              <FilterChip
                key={c.value}
                active={category === c.value}
                onClick={() => {
                  if (!empty) setSearchParams({ category: c.value });
                }}
              >
                <span className={empty ? "opacity-40" : undefined}>
                  {c.label}
                  {categoryFacets ? ` (${count})` : ""}
                </span>
              </FilterChip>
            );
          })}
        </div>


        <div className="mt-10 grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className={`${showFilters ? "block" : "hidden"} lg:block`} aria-label="Filter produk">
            <div className="space-y-8 border border-line p-5">
              <PriceFilter
                min={params.min}
                max={params.max}
                bounds={{ min: facets?.minPrice ?? 0, max: facets?.maxPrice ?? 0 }}
                onApply={(min, max) => setSearchParams({ min, max })}
              />
              <FacetGroup
                title="Ketersediaan"
                options={(facets?.availability ?? []).map((f) => ({
                  ...f,
                  label: AVAILABILITY_LABEL[f.value as Availability] ?? f.value,
                }))}
                selected={params.avail ?? []}
                onToggle={(v) => toggleValue("avail", v)}
              />
              <FacetGroup
                title="Kondisi"
                options={(facets?.conditions ?? []).map((f) => ({
                  ...f,
                  label: CONDITION_LABEL[f.value] ?? f.value,
                }))}
                selected={params.condition ?? []}
                onToggle={(v) => toggleValue("condition", v)}
              />
              <FacetGroup
                title="Cara beli"
                options={(facets?.units ?? [])
                  .map((f) => ({ ...f, label: UNIT_LABEL[f.value as SaleUnit]?.id ?? f.value }))
                  .sort(
                    (a, b) =>
                      SALE_UNITS.indexOf(a.value as SaleUnit) -
                      SALE_UNITS.indexOf(b.value as SaleUnit),
                  )}
                selected={params.unit ?? []}
                onToggle={(v) => toggleValue("unit", v)}
              />
              <FacetGroup
                title="Grade marbling"
                options={(facets?.grades ?? [])
                  .map((f) => ({ ...f, label: gradeLabel(f.value) ?? f.value }))
                  .sort((a, b) => GRADE_ORDER.indexOf(a.value) - GRADE_ORDER.indexOf(b.value))}
                selected={params.grade ?? []}
                onToggle={(v) => toggleValue("grade", v)}
                hint={
                  <Link to="/panduan-grade" className="underline hover:text-ink">
                    Lihat sampel marbling
                  </Link>
                }
              />
              <FacetGroup
                title="Cut"
                options={facets?.cuts ?? []}
                selected={params.cut ?? []}
                onToggle={(v) => toggleValue("cut", v)}
                collapsibleAfter={8}
              />
              <FacetGroup
                title="Asal negara"
                options={facets?.origins ?? []}
                selected={params.origin ?? []}
                onToggle={(v) => toggleValue("origin", v)}
              />
              <FacetGroup
                title="Brand"
                options={facets?.brands ?? []}
                selected={params.brand ?? []}
                onToggle={(v) => toggleValue("brand", v)}
                collapsibleAfter={8}
              />
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className="eyebrow flex items-center gap-2 border border-line px-4 py-2 text-ink lg:hidden"
                  aria-expanded={showFilters}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                </button>
                <p className="text-sm text-ash" aria-live="polite">
                  {isLoading ? "Memuat katalog…" : `${total} produk ditemukan`}
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-ash">
                Urutkan
                <select
                  value={sort}
                  onChange={(e) => setSearchParams({ sort: e.target.value as CatalogSort })}
                  className="border border-line bg-background px-3 py-2 text-sm text-ink outline-none focus:border-ink"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {activeChips.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {activeChips.map((chip, i) => (
                  <button
                    key={`${chip.label}-${i}`}
                    type="button"
                    onClick={chip.onRemove}
                    className="flex items-center gap-1 border border-line px-3 py-1.5 text-xs text-ink hover:border-ink"
                  >
                    {chip.label}
                    <X className="h-3 w-3" aria-hidden="true" />
                    <span className="sr-only">Hapus filter</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setSearchParams({
                      origin: undefined,
                      brand: undefined,
                      condition: undefined,
                      avail: undefined,
                      grade: undefined,
                      cut: undefined,
                      unit: undefined,
                      min: undefined,
                      max: undefined,
                    })
                  }
                  className="text-xs text-crimson underline"
                >
                  Hapus semua filter
                </button>
              </div>
            ) : null}

            {isError ? (
              <p className="mt-10 text-sm text-crimson">
                Katalog sedang tidak dapat dimuat. Silakan coba lagi sebentar lagi.
              </p>
            ) : null}

            <div className="mt-8 grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-56 animate-pulse bg-background" />
                  ))
                : rows.map((row) => <ProductCard key={row.id} row={row} />)}
            </div>

            {!isLoading && rows.length === 0 && !isError ? (
              <p className="mt-10 text-sm text-ash">
                Tidak ada produk yang cocok. Coba longgarkan filter atau{" "}
                <Link to="/request-quote" className="underline">
                  kirim permintaan khusus
                </Link>
                .
              </p>
            ) : null}

            {pages > 1 ? (
              <nav className="mt-12 flex items-center justify-between" aria-label="Halaman katalog">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setSearchParams({ page: Math.max(1, page - 1) }, false, true)}
                  className="eyebrow border border-line px-5 py-3 text-ink disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="text-sm text-ash">
                  Halaman {page} dari {pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setSearchParams({ page: Math.min(pages, page + 1) }, false, true)}
                  className="eyebrow border border-line px-5 py-3 text-ink disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </nav>
            ) : null}
          </div>
        </div>
      </section>
      <Recommendations />
    </SiteLayout>
  );
}

function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  collapsibleAfter,
  hint,
}: {
  title: string;
  options: (FacetValue & { label?: string })[];
  selected: string[];
  onToggle: (value: string) => void;
  collapsibleAfter?: number;
  hint?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  if (options.length === 0) return null;
  const limit = collapsibleAfter && !expanded ? collapsibleAfter : options.length;
  const visible = options.slice(0, limit);

  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-ink">{title}</legend>
      {hint ? <p className="-mt-1 mb-3 text-xs text-ash">{hint}</p> : null}
      <div className="space-y-2">
        {visible.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-ash">
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="h-4 w-4 accent-crimson"
            />
            <span className="flex-1 text-ink">{opt.label ?? opt.value}</span>
            <span className="text-xs text-ash">{opt.count}</span>
          </label>
        ))}
      </div>
      {collapsibleAfter && options.length > collapsibleAfter ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs text-crimson underline"
        >
          {expanded ? "Tampilkan lebih sedikit" : `Tampilkan ${options.length - collapsibleAfter} lainnya`}
        </button>
      ) : null}
    </fieldset>
  );
}

function PriceFilter({
  min,
  max,
  bounds,
  onApply,
}: {
  min?: number;
  max?: number;
  bounds: { min: number; max: number };
  onApply: (min: number | undefined, max: number | undefined) => void;
}) {
  const [from, setFrom] = useState(min ? String(min) : "");
  const [to, setTo] = useState(max ? String(max) : "");

  useEffect(() => {
    setFrom(min ? String(min) : "");
    setTo(max ? String(max) : "");
  }, [min, max]);

  return (
    <fieldset>
      <legend className="eyebrow mb-3 text-ink">Harga per kg</legend>
      {bounds.max > 0 ? (
        <p className="mb-2 text-xs text-ash">
          Rp {rupiah(bounds.min)} – Rp {rupiah(bounds.max)}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Min"
          aria-label="Harga minimum"
          className="w-full border border-line bg-background px-2 py-2 text-sm text-ink outline-none focus:border-ink"
        />
        <span className="text-ash">–</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Max"
          aria-label="Harga maksimum"
          className="w-full border border-line bg-background px-2 py-2 text-sm text-ink outline-none focus:border-ink"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          const a = Number(from);
          const b = Number(to);
          onApply(
            Number.isFinite(a) && a > 0 ? a : undefined,
            Number.isFinite(b) && b > 0 ? b : undefined,
          );
        }}
        className="eyebrow mt-3 w-full border border-line px-3 py-2 text-ink hover:border-ink"
      >
        Terapkan
      </button>
    </fieldset>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`eyebrow border px-4 py-2 transition-colors ${
        active ? "border-ink bg-ink text-bone" : "border-line text-ash hover:border-ink/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
