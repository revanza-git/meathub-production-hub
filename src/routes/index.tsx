import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  CreditCard,
  Snowflake,
  Truck,
  Users,
} from "lucide-react";
import { CATEGORY_PAGES } from "@/lib/meatlink/categories";
import { SiteLayout } from "@/components/site/site-layout";
import { CatalogSearch } from "@/components/site/site-header";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { PriceTag, PromoFlag } from "@/components/site/price-tag";
import { Recommendations } from "@/components/meatlink/recommendations";
import { CATEGORY_LABEL, useCatalog } from "@/lib/meatlink/catalog";
import { resolveFeatureImage, resolveProductImage, useFeaturedInventory } from "@/lib/meatlink/featured";
import { formatIdr } from "@/lib/meatlink/inventory";
import heroImg from "@/assets/hero-wagyu.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meatlink.id — Belanja Daging B2B, Harga Transparan" },
      {
        name: "description",
        content:
          "Belanja daging premium untuk bisnis: prime cut, second cut, offal dan bone dari importir terverifikasi. Harga publik per kilogram, pengiriman ke seluruh Indonesia.",
      },
      { property: "og:title", content: "Meatlink.id — Belanja daging B2B, harga transparan" },
      {
        property: "og:description",
        content:
          "Katalog daging B2B siap pesan dari importir terverifikasi, dengan harga per kilogram dan pengiriman nasional.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: "Pasokan terverifikasi",
    body: "Setiap importir dan pemasok diperiksa legalitas, dokumen dan konsistensinya sebelum masuk katalog.",
  },
  {
    icon: Snowflake,
    title: "Rantai dingin terjaga",
    body: "Produk frozen dan chilled ditangani sesuai standar suhu dari gudang sampai lokasi Anda.",
  },
  {
    icon: CreditCard,
    title: "Pembayaran fleksibel",
    body: "Transfer VA, QRIS, bayar di tempat, atau tempo (TOP) untuk perusahaan yang telah disetujui.",
  },
  {
    icon: Truck,
    title: "Pengiriman nasional",
    body: "Jadwal kirim dan estimasi tiba tercatat pada setiap pesanan, lengkap dengan nomor resi.",
  },
  {
    icon: Users,
    title: "Pemesanan untuk bisnis",
    body: "Riwayat pesanan, pesan ulang sekali klik, dan harga kontrak untuk pembeli rutin.",
  },
  {
    icon: ClipboardList,
    title: "Special sourcing",
    body: "Spesifikasi di luar katalog tetap kami carikan lewat jaringan pemasok Meatlink.",
  },
];

function HomePage() {
  return (
    <SiteLayout>
      <CommercialHero />
      <ShopByCategory />
      <AvailableNow />
      <Recommendations />
      <ShopByOrigin />
      <Benefits />
      <SpecialSourcingCta />
      <MarketInsights />
    </SiteLayout>
  );
}

/** Compact commercial hero: value proposition, working search, two CTAs. */
function CommercialHero() {
  return (
    <section className="relative isolate overflow-hidden bg-noir text-bone">
      <img
        src={heroImg}
        alt="Premium marbled wagyu ribeye on butcher paper"
        width={1600}
        height={1200}
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-noir via-noir/85 to-noir/30" />
      <div className="relative mx-auto flex min-h-[420px] max-w-7xl flex-col justify-center px-5 py-14 lg:min-h-[480px] lg:px-8">
        <div className="max-w-2xl fade-in-up">
          <p className="eyebrow text-crimson">Better Meat | Better Connections</p>
          <h1 className="mt-5 font-display text-4xl leading-[1.05] sm:text-5xl">
            Daging premium untuk bisnis Anda,
            <br />
            <span className="italic text-bone/85">siap pesan hari ini.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-bone/70">
            Prime cut, second cut, offal dan bone dari importir terverifikasi. Harga per kilogram
            ditampilkan terbuka, stok diperbarui setiap hari, pengiriman ke seluruh Indonesia.
          </p>

          <CatalogSearch dark className="mt-8 max-w-xl" />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/produk"
              className="eyebrow inline-flex items-center gap-2 bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
            >
              Belanja Produk <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/produk"
              className="eyebrow inline-flex items-center border border-white/25 px-7 py-4 text-bone transition-colors hover:bg-white/10"
            >
              Lihat Kategori
            </Link>
            <Link
              to="/request-quote"
              className="eyebrow text-bone/65 underline-offset-4 transition-colors hover:text-bone hover:underline"
            >
              Butuh spesifikasi khusus?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShelfHeading({
  eyebrow,
  title,
  to,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  to?: "/produk" | "/insights";
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-crimson">{eyebrow}</p>
        <h2 className="mt-4 font-display text-3xl sm:text-4xl">{title}</h2>
      </div>
      {to && linkLabel ? (
        <Link to={to} className="eyebrow inline-flex items-center gap-2 text-ink hover:text-crimson">
          {linkLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function ShopByCategory() {
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <ShelfHeading
          eyebrow="Belanja per kategori"
          title="Shop by Category"
          to="/produk"
          linkLabel="Semua produk"
        />
        <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORY_PAGES.map((c) => (
            <Link
              key={c.slug}
              to="/kategori/$slug"
              params={{ slug: c.slug }}
              className="group bg-card p-7 transition-colors hover:bg-noir"
            >
              <h3 className="font-display text-2xl text-ink transition-colors group-hover:text-bone">
                {c.label}
              </h3>
              <p className="mt-3 text-xs leading-relaxed text-ash transition-colors group-hover:text-bone/60">
                {c.tagline}
              </p>
              <span className="eyebrow mt-6 inline-flex items-center gap-2 text-crimson">
                Belanja <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Available-now shelf. Grid, not a carousel — never renders empty. */
function AvailableNow() {
  const { data, isLoading } = useCatalog({ page: 1, pageSize: 8 });
  const rows = data?.rows ?? [];
  if (!isLoading && rows.length === 0) return null;

  return (
    <section className="bg-sand">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <ShelfHeading
          eyebrow="Siap kirim"
          title="Available Now"
          to="/produk"
          linkLabel="Lihat semua"
        />
        <div className="mt-10 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-80 animate-pulse bg-background" />
              ))
            : rows.map((row) => (
                <Link
                  key={row.id}
                  to="/produk/$slug"
                  params={{ slug: row.slug }}
                  className="group flex flex-col bg-background transition-colors hover:bg-ink/[0.03]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
                    <img
                      src={resolveProductImage(row.image_url, row.name, row.category)}
                      alt={row.name}
                      loading="lazy"
                      width={1024}
                      height={768}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <AvailabilityBadge value={row.availability} />
                    <PromoFlag
                      price={row.public_price_idr}
                      listPrice={row.list_price_idr}
                      className="absolute left-0 top-0"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <p className="eyebrow text-crimson">{CATEGORY_LABEL[row.category]}</p>
                      <h3 className="mt-3 font-display text-lg leading-snug text-ink">{row.name}</h3>
                      <p className="mt-2 text-xs text-ash">
                        {[row.brand, row.origin, row.condition].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <PriceTag
                      price={row.public_price_idr}
                      listPrice={row.list_price_idr}
                      size="sm"
                      className="mt-5"
                    />
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

/** Origin shelf derived from live catalog data — no hardcoded brand claims. */
function ShopByOrigin() {
  const { data } = useCatalog({ page: 1, pageSize: 60 });
  const origins = Array.from(
    new Set((data?.rows ?? []).map((r) => r.origin).filter((o): o is string => Boolean(o))),
  ).slice(0, 8);
  if (origins.length === 0) return null;

  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <ShelfHeading eyebrow="Asal produk" title="Shop by Origin" />
        <div className="mt-8 flex flex-wrap gap-3">
          {origins.map((origin) => (
            <Link
              key={origin}
              to="/produk"
              search={{ q: origin }}
              className="eyebrow border border-line bg-card px-5 py-3 text-ink transition-colors hover:border-ink"
            >
              {origin}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section className="bg-noir text-bone">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <p className="eyebrow text-crimson">KENAPA MEATLINK</p>
        <h2 className="mt-6 max-w-3xl font-display text-3xl sm:text-4xl lg:text-5xl">
          Dibangun untuk pembelian bisnis, bukan ritel.
        </h2>

        <div className="mt-16 grid border border-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="group border-b border-white/10 p-8 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:[&:nth-child(odd)]:border-r-0 lg:[&:not(:nth-child(3n))]:border-r"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-crimson/40 text-crimson">
                <b.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="mt-6 font-display text-xl">{b.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-bone/65">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function SpecialSourcingCta() {
  return (
    <section className="bg-sand">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-12 lg:px-8">
        <div className="max-w-2xl">
          <p className="eyebrow text-crimson">Special sourcing</p>
          <h2 className="mt-4 font-display text-2xl sm:text-3xl">
            Tidak menemukan spesifikasi yang Anda cari?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ash">
            Kirim kebutuhan cut, grade, volume dan tanggal kirim. Tim kami mencarikannya lewat
            jaringan importir dan pemasok Meatlink.
          </p>
        </div>
        <Link
          to="/request-quote"
          className="eyebrow inline-flex items-center gap-2 border border-ink px-7 py-4 text-ink transition-colors hover:bg-ink hover:text-bone"
        >
          Kirim permintaan khusus <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function MarketInsights() {
  const { data: items = [] } = useFeaturedInventory(3);
  if (items.length === 0) return null;
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <ShelfHeading
          eyebrow="Market insights"
          title="Recently sourced"
          to="/insights"
          linkLabel="Semua insight"
        />
        <div className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="bg-card">
              <img
                src={resolveFeatureImage(item.image_url)}
                alt={item.name}
                loading="lazy"
                width={1200}
                height={900}
                className="h-52 w-full object-cover"
              />
              <div className="p-7">
                <p className="eyebrow text-crimson">{item.origin}</p>
                <h3 className="mt-4 font-display text-2xl leading-snug">{item.name}</h3>
                <dl className="mt-6 space-y-2 text-xs text-ash">
                  <div className="flex justify-between border-b border-line pb-2">
                    <dt>Brand</dt>
                    <dd className="text-ink">{item.brand || "Meatlink select"}</dd>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <dt>Average weight</dt>
                    <dd className="text-ink">{item.avg_weight_text ?? "On request"}</dd>
                  </div>
                  <div className="flex justify-between pt-1">
                    <dt>Indicative price</dt>
                    <dd className="text-crimson">
                      {Number(item.list_price_idr) > Number(item.public_price_idr) ? (
                        <span className="mr-2 text-ash line-through">
                          {formatIdr(item.list_price_idr)}
                        </span>
                      ) : null}
                      {formatIdr(item.public_price_idr)} / kg
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
