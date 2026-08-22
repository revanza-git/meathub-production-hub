import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/site-layout";
import { Recommendations } from "@/components/meatlink/recommendations";
import { ProductCard } from "@/components/site/product-card";
import {
  CATEGORIES,
  useCatalog,
  type ProductCategory,
} from "@/lib/meatlink/catalog";

type CatalogSearchParams = { q?: string; category?: ProductCategory };

export const Route = createFileRoute("/produk/")({
  validateSearch: (search: Record<string, unknown>): CatalogSearchParams => {
    const q = typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined;
    const raw = search.category;
    const category = CATEGORIES.find((c) => c.value === raw)?.value;
    return { ...(q ? { q } : {}), ...(category ? { category } : {}) };
  },
  head: () => ({
    meta: [
      { title: "Katalog Produk Daging B2B — Meatlink.id" },
      {
        name: "description",
        content:
          "Jelajahi katalog daging B2B Meatlink.id: prime cut, second cut, offal dan bone dari importir terverifikasi, dengan harga publik per kilogram.",
      },
      { property: "og:title", content: "Katalog Produk Daging B2B — Meatlink.id" },
      {
        property: "og:description",
        content:
          "Prime cut, second cut, offal dan bone dari importir terverifikasi. Harga publik per kilogram, siap dipesan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CatalogPage,
});

const PAGE_SIZE = 24;

function CatalogPage() {
  const params = Route.useSearch();
  const [searchInput, setSearchInput] = useState(params.q ?? "");
  const [search, setSearch] = useState(params.q ?? "");
  const [category, setCategory] = useState<ProductCategory | null>(params.category ?? null);
  const [page, setPage] = useState(1);

  // Header search and category menu drive the URL; mirror it into local state.
  useEffect(() => {
    setSearchInput(params.q ?? "");
    setSearch(params.q ?? "");
    setCategory(params.category ?? null);
    setPage(1);
  }, [params.q, params.category]);

  const { data, isLoading, isError } = useCatalog({ search, category, page, pageSize: PAGE_SIZE });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));


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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
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

        <div className="mt-6 flex flex-wrap gap-2">
          <FilterChip active={category === null} onClick={() => { setCategory(null); setPage(1); }}>
            Semua
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip
              key={c.value}
              active={category === c.value}
              onClick={() => {
                setCategory(c.value);
                setPage(1);
              }}
            >
              {c.label}
            </FilterChip>
          ))}
        </div>

        <p className="mt-6 text-sm text-ash" aria-live="polite">
          {isLoading ? "Memuat katalog…" : `${total} produk ditemukan`}
        </p>

        {isError ? (
          <p className="mt-10 text-sm text-crimson">
            Katalog sedang tidak dapat dimuat. Silakan coba lagi sebentar lagi.
          </p>
        ) : null}

        <div className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse bg-background" />
              ))
            : rows.map((row) => <ProductCard key={row.id} row={row} />)}

        </div>

        {!isLoading && rows.length === 0 && !isError ? (
          <p className="mt-10 text-sm text-ash">
            Tidak ada produk yang cocok. Coba kata kunci lain atau{" "}
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
              onClick={() => setPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="eyebrow border border-line px-5 py-3 text-ink disabled:opacity-40"
            >
              Berikutnya
            </button>
          </nav>
        ) : null}
      </section>
      <Recommendations />
    </SiteLayout>
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
