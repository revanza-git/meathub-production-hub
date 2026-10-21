import { Link } from "@tanstack/react-router";
import { ArrowRight, Award, Package, Tag, Truck } from "lucide-react";
import heroImg from "@/assets/hero-wagyu.jpg";
import { ImageDisclaimer } from "@/components/site/image-disclaimer";
import { CATEGORY_PAGES } from "@/lib/meatlink/categories";
import { useCatalogFacets } from "@/lib/meatlink/catalog";
import { resolveProductImage } from "@/lib/meatlink/featured";
import { useBi } from "@/lib/i18n";

const GENERIC_BRAND = /^(brazil|bahan|beef|produk|prime cut|backbone|shortrib|dry aged|other)/i;

const ORIGIN_META: Record<string, { flag: string; id: string; en: string }> = {
  australia: { flag: "🇦🇺", id: "Australia", en: "Australia" },
  japan: { flag: "🇯🇵", id: "Jepang", en: "Japan" },
  usa: { flag: "🇺🇸", id: "Amerika Serikat", en: "United States" },
  canada: { flag: "🇨🇦", id: "Kanada", en: "Canada" },
  indonesia: { flag: "🇮🇩", id: "Indonesia", en: "Indonesia" },
  brazil: { flag: "🇧🇷", id: "Brasil", en: "Brazil" },
  "new zealand": { flag: "🇳🇿", id: "Selandia Baru", en: "New Zealand" },
  india: { flag: "🇮🇳", id: "India", en: "India" },
};

const CATEGORY_PHOTO: Record<string, [string, string | null]> = {
  PRIME_CUT: ["ribeye", null],
  SECOND_CUT: ["brisket", "SECOND_CUT"],
  OFFAL: ["offal", "OFFAL"],
  BONE: ["bone", "BONE"],
};

function useHomeFacets() {
  return useCatalogFacets({ search: "", category: null }).data;
}

export function HomeHero() {
  const bi = useBi();
  const facets = useHomeFacets();
  const skuCount = facets?.categories.reduce((a, c) => a + c.count, 0) ?? 0;
  const brandCount = facets?.brands.filter((b) => !GENERIC_BRAND.test(b.value)).length ?? 0;
  const stats = [
    skuCount ? [`${Math.floor(skuCount / 50) * 50}+`, bi("produk aktif", "active products"), "/produk", Package] : null,
    brandCount ? [`${brandCount}+`, bi("merek importir", "import brands"), "/produk", Tag] : null,
    ["A5 · MB9+", bi("grade wagyu tersedia", "wagyu grades available"), "/panduan-grade", Award],
    [bi("Seluruh Indonesia", "All Indonesia"), bi("pengiriman", "delivery"), "/kontak", Truck],
  ].filter(Boolean) as [string, string, string, typeof Package][];

  return (
    <section className="relative isolate overflow-hidden bg-noir text-bone">
      <img
        src={heroImg}
        alt={bi("Wagyu ribeye marbling premium", "Premium marbled wagyu ribeye")}
        width={1600}
        height={1200}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/70 to-transparent" />
      <div className="relative mx-auto flex min-h-[540px] max-w-7xl flex-col justify-center px-5 py-16 lg:min-h-[600px] lg:px-8">
        <div className="max-w-2xl fade-in-up">
          <p className="eyebrow text-crimson">Better Meat | Better Connections</p>
          <h1 className="mt-5 font-display text-5xl leading-[1.04] sm:text-6xl lg:text-7xl">
            {bi("Daging premium, harga terbuka.", "Premium meat, open pricing.")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-bone/80 sm:text-lg">
            {bi(
              "Wagyu, prime cut hingga offal dari importir terpercaya — untuk dapur bisnis maupun rumah.",
              "Wagyu, prime cuts and offal from trusted importers — for professional and home kitchens.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/produk"
              className="eyebrow inline-flex min-h-12 items-center gap-2 bg-crimson px-7 py-3 text-bone transition-colors hover:bg-crimson-deep"
            >
              {bi("Belanja produk", "Shop products")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/request-quote"
              className="eyebrow inline-flex min-h-12 items-center gap-2 border border-bone/40 px-7 py-3 text-bone transition-colors hover:bg-bone/10"
            >
              {bi("Minta penawaran", "Request a quote")}
            </Link>
          </div>
        </div>
      </div>
      <div className="relative border-t-2 border-crimson bg-noir">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-bone/15 px-5 lg:grid-cols-4 lg:divide-x lg:px-8">
          {stats.map(([value, label, to, Icon]) => (
            <Link
              key={label}
              to={to}
              className="group flex flex-col items-center gap-1 py-6 text-center transition-colors hover:bg-bone/5"
            >
              <Icon className="h-5 w-5 text-crimson transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
              <dt className="sr-only">{label}</dt>
              <dd className="mt-1 font-display text-2xl text-bone sm:text-3xl">{value}</dd>
              <dd className="text-xs uppercase tracking-wider text-bone/60 group-hover:text-bone">{label}</dd>
            </Link>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function HomeCategories() {
  const bi = useBi();
  const facets = useHomeFacets();
  const counts = new Map((facets?.categories ?? []).map((c) => [c.value, c.count]));
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-crimson">{bi("Kategori", "Categories")}</p>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl">{bi("Belanja per kategori", "Shop by category")}</h2>
          </div>
          <Link to="/produk" className="eyebrow inline-flex items-center gap-2 text-ink hover:text-crimson">
            {bi("Semua produk", "All products")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_PAGES.map((c, i) => {
            const [kw, cat] = CATEGORY_PHOTO[c.value] ?? ["striploin", null];
            const count = counts.get(c.value);
            return (
              <Link
                key={c.slug}
                to="/kategori/$slug"
                params={{ slug: c.slug }}
                className="group relative block aspect-[4/5] overflow-hidden bg-noir"
              >
                <img
                  src={resolveProductImage(null, kw, cat, null, null, c.slug, i)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={1000}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/30 to-transparent" />
                <ImageDisclaimer variant="overlay" className="absolute left-2 top-2 z-10" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-bone">
                  {count ? <p className="text-xs uppercase tracking-wider text-bone/70">{count} {bi("produk", "products")}</p> : null}
                  <h3 className="mt-1 font-display text-3xl">{c.label}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-bone/70">{c.tagline}</p>
                  <span className="eyebrow mt-4 inline-flex items-center gap-2 text-bone">
                    {bi("Belanja", "Shop")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomeOrigins() {
  const bi = useBi();
  const facets = useHomeFacets();
  const merged = new Map<string, { raw: string; count: number }>();
  for (const o of facets?.origins ?? []) {
    const key = o.value.trim().toLowerCase();
    if (!key || key === "other") continue;
    const prev = merged.get(key);
    merged.set(key, { raw: prev?.raw ?? o.value, count: (prev?.count ?? 0) + o.count });
  }
  const origins = [...merged.entries()].sort((a, b) => b[1].count - a[1].count);
  if (origins.length === 0) return null;
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <p className="eyebrow text-crimson">{bi("Asal produk", "Origin")}</p>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl">{bi("Belanja per negara asal", "Shop by origin")}</h2>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {origins.map(([key, o]) => {
            const meta = ORIGIN_META[key];
            return (
              <Link
                key={key}
                to="/produk"
                search={{ origin: [o.raw] }}
                className="group flex items-center gap-3 border border-line bg-card p-4 transition-colors hover:border-ink"
              >
                <span className="text-3xl" aria-hidden="true">{meta?.flag ?? "🌐"}</span>
                <span>
                  <span className="block font-display text-lg leading-tight text-ink">{meta ? bi(meta.id, meta.en) : o.raw}</span>
                  <span className="text-xs text-ash">{o.count} {bi("produk", "products")}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomeBrands() {
  const bi = useBi();
  const facets = useHomeFacets();
  const brands = (facets?.brands ?? [])
    .filter((b) => !GENERIC_BRAND.test(b.value))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  if (brands.length === 0) return null;
  return (
    <section className="border-y border-line bg-sand">
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <p className="eyebrow text-center text-ash">{bi("Merek yang tersedia di Meatlink", "Brands available on Meatlink")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-4">
          {brands.map((b) => (
            <Link
              key={b.value}
              to="/produk"
              search={{ brand: [b.value] }}
              className="font-display text-xl uppercase tracking-wide text-ink/60 transition-colors hover:text-crimson"
            >
              {b.value}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
