import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { MarketLayout } from "@/components/market/market-layout";
import { ProductCard } from "@/components/market/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, PRODUCTS, VENDORS, categoryBySlug } from "@/lib/market/data";
import { rupiah } from "@/lib/market/format";

type Search = {
  q?: string;
  kategori?: string;
  vendor?: string;
  asal?: string;
  min?: number;
  max?: number;
  halal?: boolean;
  beku?: boolean;
  urut?: string;
};

export const Route = createFileRoute("/produk/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    kategori: typeof s.kategori === "string" ? s.kategori : undefined,
    vendor: typeof s.vendor === "string" ? s.vendor : undefined,
    asal: s.asal === "impor" || s.asal === "lokal" ? s.asal : undefined,
    min: Number.isFinite(Number(s.min)) && s.min !== undefined ? Number(s.min) : undefined,
    max: Number.isFinite(Number(s.max)) && s.max !== undefined ? Number(s.max) : undefined,
    halal: s.halal === true || s.halal === "true" ? true : undefined,
    beku: s.beku === true || s.beku === "true" ? true : undefined,
    urut: typeof s.urut === "string" ? s.urut : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Katalog Daging Sapi Grosir B2B — MEATHUB" },
      {
        name: "description",
        content:
          "Telusuri ratusan potongan daging sapi lokal dan impor dari vendor terverifikasi MEATHUB. Filter harga, grade, asal, dan vendor.",
      },
      { property: "og:title", content: "Katalog Daging Sapi Grosir B2B — MEATHUB" },
      {
        property: "og:description",
        content: "Katalog daging sapi B2B dari vendor terverifikasi, harga grosir, cold-chain nasional.",
      },
    ],
  }),
  component: ProdukPage,
});

const SORTS = [
  { id: "relevan", label: "Paling relevan" },
  { id: "termurah", label: "Harga terendah" },
  { id: "termahal", label: "Harga tertinggi" },
  { id: "terlaris", label: "Terlaris" },
  { id: "rating", label: "Rating tertinggi" },
];

function ProdukPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const [openFilter, setOpenFilter] = useState(false);
  const [minInput, setMinInput] = useState(search.min ? String(search.min) : "");
  const [maxInput, setMaxInput] = useState(search.max ? String(search.max) : "");

  const setSearch = (patch: Partial<Search>) =>
    nav({ to: "/produk", search: (prev: Search) => ({ ...prev, ...patch }) });

  const results = useMemo(() => {
    const q = (search.q ?? "").trim().toLowerCase();
    let list = PRODUCTS.filter((p) => {
      if (q && !`${p.name} ${p.cut} ${p.grade} ${p.origin}`.toLowerCase().includes(q)) return false;
      if (search.kategori && p.categorySlug !== search.kategori) return false;
      if (search.vendor && p.vendorId !== search.vendor) return false;
      if (search.asal === "impor" && !p.imported) return false;
      if (search.asal === "lokal" && p.imported) return false;
      if (search.min && p.price < search.min) return false;
      if (search.max && p.price > search.max) return false;
      if (search.halal && !p.halal) return false;
      if (search.beku && !p.frozen) return false;
      return true;
    });
    const urut = search.urut ?? "relevan";
    list = [...list].sort((a, b) => {
      if (urut === "termurah") return a.price - b.price;
      if (urut === "termahal") return b.price - a.price;
      if (urut === "terlaris") return b.sold - a.sold;
      if (urut === "rating") return b.rating - a.rating;
      return Number(b.bestSeller ?? false) - Number(a.bestSeller ?? false);
    });
    return list;
  }, [search]);

  const activeChips: { label: string; clear: Partial<Search> }[] = [];
  if (search.q) activeChips.push({ label: `"${search.q}"`, clear: { q: undefined } });
  if (search.kategori)
    activeChips.push({
      label: categoryBySlug(search.kategori)?.name ?? search.kategori,
      clear: { kategori: undefined },
    });
  if (search.vendor)
    activeChips.push({
      label: VENDORS.find((v) => v.id === search.vendor)?.name ?? "Vendor",
      clear: { vendor: undefined },
    });
  if (search.asal) activeChips.push({ label: search.asal === "impor" ? "Impor" : "Lokal", clear: { asal: undefined } });
  if (search.halal) activeChips.push({ label: "Halal", clear: { halal: undefined } });
  if (search.beku) activeChips.push({ label: "Beku", clear: { beku: undefined } });
  if (search.min || search.max)
    activeChips.push({
      label: `${rupiah(search.min ?? 0)} – ${search.max ? rupiah(search.max) : "∞"}`,
      clear: { min: undefined, max: undefined },
    });

  const filters = (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Kategori
        </h2>
        <ul className="space-y-1 text-sm">
          <li>
            <button
              type="button"
              onClick={() => setSearch({ kategori: undefined })}
              className={!search.kategori ? "font-semibold text-maroon" : "text-ink-soft hover:text-maroon"}
            >
              Semua kategori
            </button>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => setSearch({ kategori: c.slug })}
                className={
                  search.kategori === c.slug ? "font-semibold text-maroon" : "text-ink-soft hover:text-maroon"
                }
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Rentang harga
        </h2>
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            placeholder="Min"
            aria-label="Harga minimum"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
          />
          <span aria-hidden="true">–</span>
          <Input
            inputMode="numeric"
            placeholder="Maks"
            aria-label="Harga maksimum"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full"
          onClick={() =>
            setSearch({
              min: minInput ? Number(minInput) : undefined,
              max: maxInput ? Number(maxInput) : undefined,
            })
          }
        >
          Terapkan harga
        </Button>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Asal produk
        </h2>
        <div className="flex gap-2">
          {(["lokal", "impor"] as const).map((a) => (
            <Button
              key={a}
              size="sm"
              variant={search.asal === a ? "default" : "outline"}
              onClick={() => setSearch({ asal: search.asal === a ? undefined : a })}
            >
              {a === "lokal" ? "Lokal" : "Impor"}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Sertifikasi & kondisi
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!search.halal}
            onCheckedChange={(v) => setSearch({ halal: v ? true : undefined })}
          />
          Halal tersertifikasi
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={!!search.beku}
            onCheckedChange={(v) => setSearch({ beku: v ? true : undefined })}
          />
          Beku (frozen)
        </label>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Vendor
        </h2>
        <ul className="space-y-1 text-sm">
          {VENDORS.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setSearch({ vendor: search.vendor === v.id ? undefined : v.id })}
                className={search.vendor === v.id ? "font-semibold text-maroon" : "text-ink-soft hover:text-maroon"}
              >
                {v.name}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  return (
    <MarketLayout>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-maroon">Beranda</Link> / <span className="text-ink">Katalog</span>
          {search.kategori ? ` / ${categoryBySlug(search.kategori)?.name ?? ""}` : ""}
        </nav>

        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-ink">
              {search.kategori ? categoryBySlug(search.kategori)?.name : "Semua produk"}
            </h1>
            <p className="text-sm text-muted-foreground">{results.length} produk ditemukan</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 lg:hidden"
              onClick={() => setOpenFilter((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filter
            </Button>
            <Select value={search.urut ?? "relevan"} onValueChange={(v) => setSearch({ urut: v })}>
              <SelectTrigger className="w-[170px]" aria-label="Urutkan produk">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {activeChips.map((c) => (
              <Badge
                key={c.label}
                variant="outline"
                className="cursor-pointer gap-1 border-maroon/30 bg-maroon/5 text-maroon"
                onClick={() => setSearch(c.clear)}
              >
                {c.label} <X className="h-3 w-3" aria-hidden="true" />
              </Badge>
            ))}
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() =>
                nav({ to: "/produk", search: {} })
              }
            >
              Reset semua
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className={`${openFilter ? "block" : "hidden"} lg:block`}>
            <div className="rounded-xl border border-border bg-card p-4">{filters}</div>
          </aside>

          <div>
            {results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                <p className="font-display text-lg font-bold text-ink">Produk tidak ditemukan</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Coba ubah kata kunci atau reset filter untuk melihat katalog lengkap.
                </p>
                <Button className="mt-4" onClick={() => nav({ to: "/produk", search: {} })}>
                  Lihat semua produk
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketLayout>
  );
}
