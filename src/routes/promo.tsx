import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHero } from "@/components/site/site-layout";
import { ProductCard } from "@/components/site/product-card";
import { useCatalog } from "@/lib/meatlink/catalog";

const TITLE = "Promo Daging B2B — Harga Spesial Meatlink.id";
const DESCRIPTION =
  "Daftar produk daging dengan harga promo aktif di Meatlink.id. Stok terbatas, harga per kilogram sudah termasuk layanan Meatlink.";

export const Route = createFileRoute("/promo")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PromoPage,
});

const PAGE_SIZE = 24;

function PromoPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useCatalog({ promoOnly: true, page, pageSize: PAGE_SIZE });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Promo"
        title={
          <>
            Harga spesial,
            <br />
            <span className="italic text-bone/85">stok terbatas.</span>
          </>
        }
        intro="Produk dengan potongan harga aktif dari pemasok kami. Harga promo berlaku sampai batas waktu yang tertera dan otomatis kembali normal setelahnya."
      />

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <h2 className="font-display text-2xl sm:text-3xl">Produk promo aktif</h2>
        <p className="mt-2 text-sm text-ash" aria-live="polite">
          {isLoading ? "Memuat promo…" : `${total} produk sedang promo`}
        </p>

        {isError ? (
          <p className="mt-10 text-sm text-crimson">
            Daftar promo sedang tidak dapat dimuat. Silakan coba lagi sebentar lagi.
          </p>
        ) : null}

        <div className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse bg-background" />
              ))
            : rows.map((row) => <ProductCard key={row.id} row={row} />)}
        </div>

        {!isLoading && rows.length === 0 && !isError ? (
          <div className="mt-10">
            <p className="text-sm text-ash">
              Belum ada promo aktif saat ini. Lihat{" "}
              <Link to="/produk" className="underline">
                katalog lengkap
              </Link>{" "}
              atau{" "}
              <Link to="/request-quote" className="underline">
                minta penawaran volume
              </Link>{" "}
              untuk harga khusus.
            </p>
          </div>
        ) : null}

        {pages > 1 ? (
          <nav className="mt-12 flex items-center justify-between" aria-label="Halaman promo">
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
    </SiteLayout>
  );
}
