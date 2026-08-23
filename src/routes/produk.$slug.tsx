import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { AddToCart } from "@/components/site/add-to-cart";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { PriceTag, PromoFlag } from "@/components/site/price-tag";
import { WHATSAPP_NUMBER } from "@/lib/meatlink/config";
import { formatIdr } from "@/lib/meatlink/inventory";
import { resolveProductImage } from "@/lib/meatlink/featured";
import {
  AVAILABILITY_LABEL,
  CATEGORY_LABEL,
  useCatalog,
  useProduct,
  type Availability,
  type CatalogProduct,
  type ProductCategory,
} from "@/lib/meatlink/catalog";

export const Route = createFileRoute("/produk/$slug")({
  head: ({ params }) => {
    const readable = params.slug.replace(/-/g, " ");
    const title = `${readable.replace(/\b\w/g, (c) => c.toUpperCase())} — Katalog Meatlink.id`;
    const description = `Spesifikasi, asal dan harga publik per kilogram untuk ${readable} dari jaringan pemasok terverifikasi Meatlink.id.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://meatlink.id/produk/${params.slug}` }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: product, isLoading, isError } = useProduct(slug);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <Link to="/produk" className="eyebrow inline-flex items-center gap-2 text-ash hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Kembali ke katalog
        </Link>

        {isLoading ? (
          <div className="mt-10 h-64 animate-pulse bg-ink/5" />
        ) : isError || !product ? (
          <div className="mt-10">
            <h1 className="font-display text-3xl text-ink">Produk tidak ditemukan</h1>
            <p className="mt-3 text-sm text-ash">
              Produk ini mungkin sudah tidak dipublikasikan.{" "}
              <Link to="/request-quote" className="underline">
                Kirim permintaan
              </Link>{" "}
              dan tim kami akan mencarikan alternatif.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="relative mb-8 aspect-[16/10] overflow-hidden bg-ink/5">
                <img
                  src={resolveProductImage(product.image_url, product.name, product.category)}
                  alt={product.name}
                  width={1024}
                  height={768}
                  className="h-full w-full object-cover"
                />
                <AvailabilityBadge value={product.availability} />
                <PromoFlag
                  price={product.public_price_idr}
                  listPrice={product.list_price_idr}
                  className="absolute left-0 top-0"
                />
              </div>
              <p className="eyebrow text-crimson">{CATEGORY_LABEL[product.category]}</p>
              <h1 className="mt-4 font-display text-4xl leading-tight text-ink lg:text-5xl">
                {product.name}
              </h1>
              <p className="mt-4 text-sm text-ash">
                {[product.brand, product.origin, product.condition].filter(Boolean).join(" · ")}
              </p>

              {product.description ? (
                <p className="mt-8 max-w-2xl text-base leading-relaxed text-ink/80">
                  {product.description}
                </p>
              ) : null}

              <dl className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2">
                <Spec label="Kategori" value={CATEGORY_LABEL[product.category]} />
                <Spec label="Asal" value={product.origin ?? "—"} />
                <Spec label="Brand" value={product.brand ?? "—"} />
                <Spec label="Kondisi" value={product.condition ?? "—"} />
                <Spec
                  label="Berat rata-rata"
                  value={
                    product.avg_weight_text ??
                    (product.avg_weight_kg ? `${product.avg_weight_kg} kg` : "—")
                  }
                />
                <Spec
                  label="Ketersediaan"
                  value={
                    AVAILABILITY_LABEL[product.availability as Availability] ?? product.availability
                  }
                />
              </dl>
            </div>

            <aside className="h-fit border border-line bg-background p-8 lg:sticky lg:top-28">
              <p className="eyebrow text-ash">Harga publik</p>
              <PriceTag
                price={product.public_price_idr}
                listPrice={product.list_price_idr}
                size="lg"
                className="mt-3"
              />
              {product.promo_until ? (
                <p className="mt-2 text-xs text-crimson">
                  Harga promo berlaku sampai {formatDate(product.promo_until)}.
                </p>
              ) : null}
              <p className="mt-2 text-xs text-ash">
                Harga indikatif untuk pembelian B2B. Harga final mengikuti volume dan lokasi kirim.
              </p>

              <VolumeTiers price={Number(product.public_price_idr)} />

              <ul className="mt-7 space-y-3 text-sm text-ink/80">
                {[
                  "Pemasok terverifikasi",
                  "Dokumen halal & sertifikat tersedia",
                  "Pengiriman ke seluruh Indonesia",
                ].map((b) => (
                  <li key={b} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-crimson" />
                    {b}
                  </li>
                ))}
              </ul>

              <AddToCart slug={slug} name={product.name} price={Number(product.public_price_idr)} />

              <div className="mt-4 grid gap-3">
                <Link
                  to="/request-quote"
                  className="eyebrow bg-crimson px-6 py-4 text-center text-bone transition-colors hover:bg-crimson-deep"
                >
                  Minta penawaran
                </Link>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    `Halo Meatlink, saya tertarik dengan ${product.name}.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eyebrow inline-flex items-center justify-center gap-2 border border-ink/25 px-6 py-4 text-ink transition-colors hover:bg-ink/5"
                >
                  <MessageCircle className="h-4 w-4" /> Tanya via WhatsApp
                </a>
              </div>
            </aside>
          </div>
        )}

        {product ? <RelatedProducts category={product.category} slug={slug} /> : null}
        {product ? <ProductJsonLd product={product} /> : null}
      </section>
    </SiteLayout>
  );
}

/**
 * Indicative pricing per purchase unit. The listed public price is the loaf/retail
 * level; larger units are cheaper per kg. Internal margin structure is never shown.
 */
const UNIT_TIERS = [
  { label: "Loaf / ritel", note: "Per loaf atau satuan", cut: 0 },
  { label: "Karton", note: "Kelipatan karton utuh", cut: 15_000 },
  { label: "Ton", note: "Mulai 1.000 kg", cut: 20_000 },
] as const;

function VolumeTiers({ price }: { price: number }) {
  if (!Number.isFinite(price) || price <= 0) return null;
  return (
    <div className="mt-6 border border-line">
      <p className="eyebrow border-b border-line px-4 py-3 text-ash">Indikasi harga per satuan beli</p>
      <ul className="divide-y divide-line text-sm">
        {UNIT_TIERS.map((t) => (
          <li key={t.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="text-ash">
              {t.label}
              <span className="block text-xs text-ash/70">{t.note}</span>
            </span>
            <span className="whitespace-nowrap text-ink">
              {formatIdr(Math.max(0, price - t.cut))} /kg
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-3 text-xs text-ash">
        Indikatif. Harga final per satuan beli dikonfirmasi tim sales setelah permintaan dikirim.
      </p>
    </div>
  );
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Product structured data so search engines can surface price and availability. */
function ProductJsonLd({ product }: { product: CatalogProduct }) {
  const price = Number(product.public_price_idr);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.description ??
      `${product.name} — ${[product.brand, product.origin, product.condition].filter(Boolean).join(", ")}`,
    category: CATEGORY_LABEL[product.category],
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    countryOfOrigin: product.origin ?? undefined,
    offers:
      price > 0
        ? {
            "@type": "Offer",
            priceCurrency: "IDR",
            price,
            url: `https://meatlink.id/produk/${product.slug}`,
            availability:
              product.availability === "PRE_ORDER"
                ? "https://schema.org/PreOrder"
                : "https://schema.org/InStock",
            ...(product.promo_until ? { priceValidUntil: product.promo_until } : {}),
          }
        : undefined,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Other products in the same category, excluding the one being viewed. */
function RelatedProducts({ category, slug }: { category: ProductCategory; slug: string }) {
  const { data } = useCatalog({ category, page: 1, pageSize: 8 });
  const rows = (data?.rows ?? []).filter((r) => r.slug !== slug).slice(0, 4);
  if (rows.length === 0) return null;

  return (
    <section className="mt-20 border-t border-line pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-3xl text-ink">Produk terkait</h2>
        <Link to="/produk" className="eyebrow text-ash hover:text-ink">
          Lihat semua
        </Link>
      </div>
      <div className="mt-8 grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
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
            </div>
            <div className="p-5">
              <h3 className="font-display text-lg leading-snug text-ink">{row.name}</h3>
              <p className="mt-1 text-xs text-ash">
                {[row.brand, row.origin].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-3 font-display text-xl text-ink">
                {formatIdr(row.public_price_idr)}
                <span className="text-sm text-ash"> /kg</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5">
      <dt className="eyebrow text-ash">{label}</dt>
      <dd className="mt-2 text-sm text-ink">{value}</dd>
    </div>
  );
}
