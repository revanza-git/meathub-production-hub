import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/site/site-layout";
import { ProductCard } from "@/components/site/product-card";
import { useCatalog } from "@/lib/meatlink/catalog";
import { CATEGORY_PAGES, categoryBySlug } from "@/lib/meatlink/categories";

export const Route = createFileRoute("/kategori/$slug")({
  loader: ({ params }) => {
    const category = categoryBySlug(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Kategori tidak ditemukan — Meatlink.id" }, { name: "robots", content: "noindex" }],
      };
    }
    const { label, tagline } = loaderData.category;
    const title = `${label} — Katalog Daging B2B Meatlink.id`;
    const description = `${label}: ${tagline}. Harga publik per kilogram, stok diperbarui harian, pengiriman ke seluruh Indonesia.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "keywords", content: `${label}, harga ${label.toLowerCase()} per kg, supplier daging B2B, daging impor Indonesia` },
      ],
      links: [{ rel: "canonical", href: `https://meatlink.id/kategori/${loaderData.category.slug}` }],
    };
  },
  component: CategoryPageView,
  notFoundComponent: CategoryNotFound,
});

function CategoryPageView() {
  const { category } = Route.useLoaderData();
  const { data, isLoading, isError } = useCatalog({ category: category.value, pageSize: 24 });
  const rows = data?.rows ?? [];

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Kategori"
        title={
          <>
            {category.label},
            <br />
            <span className="italic text-bone/85">siap pesan hari ini.</span>
          </>
        }
        intro={category.intro}
      />

      <nav aria-label="Kategori lain" className="border-b border-line bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-5 py-5 lg:px-8">
          {CATEGORY_PAGES.map((c) => (
            <Link
              key={c.slug}
              to="/kategori/$slug"
              params={{ slug: c.slug }}
              className={`eyebrow border px-4 py-2 transition-colors ${
                c.slug === category.slug
                  ? "border-ink bg-ink text-bone"
                  : "border-line text-ash hover:border-ink hover:text-ink"
              }`}
            >
              {c.label}
            </Link>
          ))}
          <Link
            to="/produk"
            className="eyebrow border border-line px-4 py-2 text-ash transition-colors hover:border-ink hover:text-ink"
          >
            Semua produk
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <h2 className="font-display text-2xl sm:text-3xl">{category.label}</h2>
        <p className="mt-2 text-sm text-ash" aria-live="polite">
          {isLoading ? "Memuat katalog…" : `${data?.total ?? 0} produk dalam ${category.label}`}
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

        {!isLoading && !isError && rows.length === 0 ? (
          <p className="mt-10 text-sm text-ash">
            Belum ada stok pada kategori ini.{" "}
            <Link to="/request-quote" className="underline">
              Kirim permintaan khusus
            </Link>{" "}
            dan tim kami mencarikannya.
          </p>
        ) : null}
      </section>
    </SiteLayout>
  );
}

function CategoryNotFound() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Kategori"
        title="Kategori tidak ditemukan"
        intro="Halaman kategori yang Anda cari tidak tersedia. Lihat seluruh katalog Meatlink."
      />
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Link to="/produk" className="eyebrow bg-crimson px-6 py-3 text-bone">
          Lihat semua produk
        </Link>
      </section>
    </SiteLayout>
  );
}
