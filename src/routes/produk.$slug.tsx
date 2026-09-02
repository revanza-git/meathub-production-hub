import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { AddToCart } from "@/components/site/add-to-cart";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { ImageDisclaimer } from "@/components/site/image-disclaimer";
import { PriceTag, PromoFlag } from "@/components/site/price-tag";
import { WHATSAPP_NUMBER } from "@/lib/meatlink/config";
import {
  formatIdr,
  unitPriceFromPublic,
  type PurchaseUnit,
} from "@/lib/meatlink/inventory";
import { resolveProductImage } from "@/lib/meatlink/featured";
import {
  useBi,
  useLabel,
  useLang,
  AVAILABILITY_LABEL_I18N,
  CATEGORY_LABEL_I18N,
} from "@/lib/i18n";
import {
  CATEGORY_LABEL,
  GRADE_HINT,
  gradeLabel,
  type GradeBand,
  useCatalog,
  useProduct,
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
  const bi = useBi();
  const label = useLabel();
  const { lang } = useLang();
  const { data: product, isLoading, isError } = useProduct(slug);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <Link to="/produk" className="eyebrow inline-flex items-center gap-2 text-ash hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> {bi("Kembali ke katalog", "Back to catalog")}
        </Link>

        {isLoading ? (
          <div className="mt-10 h-64 animate-pulse bg-ink/5" />
        ) : isError || !product ? (
          <div className="mt-10">
            <h1 className="font-display text-3xl text-ink">
              {bi("Produk tidak ditemukan", "Product not found")}
            </h1>
            <p className="mt-3 text-sm text-ash">
              {bi(
                "Produk ini mungkin sudah tidak dipublikasikan.",
                "This product may no longer be published.",
              )}{" "}
              <Link to="/request-quote" className="underline">
                {bi("Kirim permintaan", "Send a request")}
              </Link>{" "}
              {bi(
                "dan tim kami akan mencarikan alternatif.",
                "and our team will source an alternative.",
              )}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="relative mb-3 aspect-[16/10] overflow-hidden bg-ink/5">
                <img
                  src={resolveProductImage(product.image_url, product.name, product.category, product.grade_band, product.cut_type)}
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
              <ImageDisclaimer />
              <p className="eyebrow text-crimson">{label(CATEGORY_LABEL_I18N, product.category)}</p>
              <h1 className="mt-4 font-display text-4xl leading-tight text-ink lg:text-5xl">
                {product.name}
              </h1>
              <p className="mt-4 text-sm text-ash">
                {[product.brand, product.origin, product.condition, product.cut_type]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {product.grade_band ? (
                <p className="mt-3 text-sm text-ash">
                  <span className="mr-2 inline-block border border-line px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-ink">
                    {gradeLabel(product.grade_band)}
                  </span>
                  {bi(
                    GRADE_HINT[product.grade_band as GradeBand]?.id ?? "",
                    GRADE_HINT[product.grade_band as GradeBand]?.en ?? "",
                  )}{" "}
                  <Link to="/panduan-grade" className="underline hover:text-ink">
                    {bi("Panduan grade", "Grade guide")}
                  </Link>
                </p>
              ) : null}

              {product.description ? (
                <p className="mt-8 max-w-2xl text-base leading-relaxed text-ink/80">
                  {product.description}
                </p>
              ) : null}

              <dl className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2">
                <Spec
                  label={bi("Kategori", "Category")}
                  value={label(CATEGORY_LABEL_I18N, product.category)}
                />
                <Spec label={bi("Asal", "Origin")} value={product.origin ?? "—"} />
                <Spec label={bi("Brand", "Brand")} value={product.brand ?? "—"} />
                <Spec label={bi("Kondisi", "Condition")} value={product.condition ?? "—"} />
                <Spec
                  label={bi("Grade marbling", "Marbling grade")}
                  value={gradeLabel(product.grade_band) ?? bi("Ungraded", "Ungraded")}
                />
                <Spec label={bi("Cut", "Cut")} value={product.cut_type ?? "—"} />
                <Spec
                  label={bi("Berat rata-rata", "Average weight")}
                  value={
                    product.avg_weight_text ??
                    (product.avg_weight_kg ? `${product.avg_weight_kg} kg` : "—")
                  }
                />
                <Spec
                  label={bi("Ketersediaan", "Availability")}
                  value={label(AVAILABILITY_LABEL_I18N, product.availability)}
                />
              </dl>
            </div>

            <aside className="h-fit border border-line bg-background p-8 lg:sticky lg:top-28">
              <p className="eyebrow text-ash">{bi("Harga publik", "Public price")}</p>
              <PriceTag
                price={product.public_price_idr}
                listPrice={product.list_price_idr}
                size="lg"
                className="mt-3"
              />
              {product.promo_until ? (
                <p className="mt-2 text-xs text-crimson">
                  {bi("Harga promo berlaku sampai", "Promo price valid until")}{" "}
                  {formatDate(product.promo_until, lang)}.
                </p>
              ) : null}
              <p className="mt-2 text-xs text-ash">
                {bi(
                  "Harga indikatif untuk pembelian B2B. Harga final mengikuti volume dan lokasi kirim.",
                  "Indicative price for business purchases. Final pricing depends on volume and delivery location.",
                )}
              </p>

              <VolumeTiers
                price={Number(product.public_price_idr)}
                channels={product.sale_channels}
                retailPrice={product.retail_price_idr}
                retailPack={product.retail_pack_text}
              />

              <ul className="mt-7 space-y-3 text-sm text-ink/80">
                {[
                  bi("Pemasok terverifikasi", "Verified suppliers"),
                  bi("Dokumen halal & sertifikat tersedia", "Halal documents & certificates available"),
                  bi("Pengiriman ke seluruh Indonesia", "Delivery across Indonesia"),
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
                  {bi("Minta penawaran", "Request a quote")}
                </Link>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    bi(
                      `Halo Meatlink, saya tertarik dengan ${product.name}.`,
                      `Hello Meatlink, I am interested in ${product.name}.`,
                    ),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eyebrow inline-flex items-center justify-center gap-2 border border-ink/25 px-6 py-4 text-ink transition-colors hover:bg-ink/5"
                >
                  <MessageCircle className="h-4 w-4" /> {bi("Tanya via WhatsApp", "Ask via WhatsApp")}
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
  {
    unit: "loaf",
    label: { id: "Loaf", en: "Loaf" },
    note: { id: "Per loaf atau satuan", en: "Per loaf or single unit" },
  },
  {
    unit: "carton",
    label: { id: "Karton", en: "Carton" },
    note: { id: "Kelipatan karton utuh", en: "Full carton multiples" },
  },
  {
    unit: "ton",
    label: { id: "Ton", en: "Ton" },
    note: { id: "Mulai 1.000 kg", en: "From 1,000 kg" },
  },
] as const satisfies readonly {
  unit: PurchaseUnit;
  label: { id: string; en: string };
  note: { id: string; en: string };
}[];

const UNIT_CHANNEL: Record<PurchaseUnit, string> = {
  retail: "RETAIL",
  loaf: "LOAF",
  carton: "CTN",
  ton: "TON",
};

function VolumeTiers({
  price,
  channels,
  retailPrice,
  retailPack,
}: {
  price: number;
  channels?: string[] | null;
  retailPrice?: number | null;
  retailPack?: string | null;
}) {
  const bi = useBi();
  const margins = useUnitMargins();
  if (!Number.isFinite(price) || price <= 0) return null;
  const set = new Set(
    channels && channels.length > 0 ? channels.map((c) => c.toUpperCase()) : ["LOAF", "CTN", "TON"],
  );
  const tiers = UNIT_TIERS.filter((t) => set.has(UNIT_CHANNEL[t.unit]));
  const showRetail = set.has("RETAIL");
  const retailPerKg =
    retailPrice && Number(retailPrice) > 0
      ? Number(retailPrice)
      : unitPriceFromPublic(price, "retail", margins);
  if (!showRetail && tiers.length === 0) return null;

  return (
    <div className="mt-6 border border-line">
      <p className="eyebrow border-b border-line px-4 py-3 text-ash">
        {bi("Indikasi harga per satuan beli", "Indicative price per purchase unit")}
      </p>
      <ul className="divide-y divide-line text-sm">
        {showRetail ? (
          <li className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="text-ash">
              {bi("Ritel (eceran)", "Retail pack")}
              <span className="block text-xs text-ash/70">
                {retailPack?.trim() || bi("Kemasan ritel ±1 kg", "Retail pack ~1 kg")}
              </span>
            </span>
            <span className="whitespace-nowrap text-ink">{formatIdr(retailPerKg)} /kg</span>
          </li>
        ) : null}
        {tiers.map((t) => (
          <li key={t.unit} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="text-ash">
              {bi(t.label.id, t.label.en)}
              <span className="block text-xs text-ash/70">{bi(t.note.id, t.note.en)}</span>
            </span>
            <span className="whitespace-nowrap text-ink">
              {formatIdr(unitPriceFromPublic(price, t.unit))} /kg
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-3 text-xs text-ash">
        {bi(
          "Indikatif. Harga final per satuan beli dikonfirmasi tim sales setelah permintaan dikirim.",
          "Indicative only. Final per-unit pricing is confirmed by our sales team after your request is sent.",
        )}
      </p>
    </div>
  );
}

function formatDate(value: string, lang: "id" | "en" = "id") {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
  const bi = useBi();
  const { data } = useCatalog({ category, page: 1, pageSize: 8 });
  const rows = (data?.rows ?? []).filter((r) => r.slug !== slug).slice(0, 4);
  if (rows.length === 0) return null;

  return (
    <section className="mt-20 border-t border-line pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-3xl text-ink">{bi("Produk terkait", "Related products")}</h2>
        <Link to="/produk" className="eyebrow text-ash hover:text-ink">
          {bi("Lihat semua", "View all")}
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
                src={resolveProductImage(row.image_url, row.name, row.category, row.grade_band, row.cut_type)}
                alt={row.name}
                loading="lazy"
                width={1024}
                height={768}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <ImageDisclaimer variant="overlay" className="absolute bottom-1.5 left-1.5 z-10" />
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
