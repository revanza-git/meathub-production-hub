import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronDown,
  ClipboardList,
  PackageSearch,
  Tags,
} from "lucide-react";
import { useState } from "react";
import { CATEGORY_PAGES } from "@/lib/meatlink/categories";
import { SiteLayout } from "@/components/site/site-layout";
import { CatalogSearch } from "@/components/site/site-header";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { ImageDisclaimer } from "@/components/site/image-disclaimer";
import { PriceTag, PromoFlag } from "@/components/site/price-tag";
import { Recommendations } from "@/components/meatlink/recommendations";
import { CATEGORY_LABEL, useCatalog, useCatalogFacets } from "@/lib/meatlink/catalog";
import { HomeHero, HomeCategories, HomeOrigins, HomeBrands } from "@/components/site/home-sections";
import { resolveProductImage, useFeaturedInventory } from "@/lib/meatlink/featured";
import { formatIdr } from "@/lib/meatlink/inventory";
import heroImg from "@/assets/hero-wagyu.jpg";
import { DICT, useLang, type TKey } from "@/lib/i18n";

const FAQ_JSONLD_KEYS = ["scale", "minimum", "coverage", "sourcing"] as const;

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_JSONLD_KEYS.map((key) => ({
    "@type": "Question",
    name: DICT[`home.faq.${key}.q` as TKey].id,
    acceptedAnswer: {
      "@type": "Answer",
      text: DICT[`home.faq.${key}.a` as TKey].id,
    },
  })),
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pengadaan Daging untuk Bisnis — Meatlink.id" },
      {
        name: "description",
        content:
          "Pengadaan daging untuk restoran, hotel, katering, toko daging dan reseller. Jelajahi harga transparan atau minta penawaran khusus di Meatlink.id.",
      },
      { property: "og:title", content: "Pengadaan Daging untuk Bisnis — Meatlink.id" },
      {
        property: "og:description",
        content:
          "Katalog dan solusi sourcing daging untuk restoran, hotel, katering, toko daging, retailer, dan reseller di Indonesia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://meatlink.id/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://meatlink.id/" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) }],
  }),
  component: HomePage,
});

const BENEFITS = [
  { icon: PackageSearch, key: "selection" },
  { icon: Tags, key: "transparent" },
  { icon: ClipboardList, key: "flexible" },
] as const;

const AUDIENCES = ["restaurant", "hotel", "catering", "butcher", "retailer", "reseller"] as const;

const CommercialHero = HomeHero;
const ShopByCategory = HomeCategories;
const ShopByOrigin = HomeOrigins;
const BrandStrip = HomeBrands;

/** Homepage Tokusen shelf: recognizable prime cuts, sourced from the live public catalog. */
function AvailableNow() {
  const { t } = useLang();
  const { data, isLoading } = useCatalog({ brands: ["TOKUSEN"], category: "PRIME_CUT", page: 1, pageSize: 100 });
  const cuts = ["RIBEYE", "TENDERLOIN", "STRIPLOIN", "TOMAHAWK"];
  const all = data?.rows ?? [];
  const rows = cuts.flatMap((cut) => {
    const list = all.filter((row) => row.name.toUpperCase().startsWith(cut) && !/\bDA\b/.test(row.name.toUpperCase()));
    const match = list.find((row) => /MB4-5/i.test(row.name)) ?? list[0];
    return match ? [match] : [];
  });
  if (!isLoading && rows.length === 0) return null;

  return (
    <section className="bg-sand">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <ShelfHeading
          eyebrow={t("home.available.eyebrow")}
          title={t("home.available.title")}
          to="/produk"
          linkLabel={t("home.available.all")}
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-96 animate-pulse bg-background" />)
            : rows.map((row) => (
                <Link
                  key={row.id}
                  to="/produk/$slug"
                  params={{ slug: row.slug }}
                  className="group flex flex-col border border-line bg-background transition-shadow hover:shadow-xl"
                >
                  <div className="relative aspect-square overflow-hidden bg-ink/5">
                    <img
                      src={resolveProductImage(row.image_url, row.name, row.category, row.grade_band, row.cut_type, row.slug ?? row.id)}
                      alt={row.name}
                      loading="lazy"
                      decoding="async"
                      width={800}
                      height={800}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <ImageDisclaimer variant="overlay" className="absolute bottom-1.5 left-1.5 z-10" />
                    <AvailabilityBadge value={row.availability} />
                    <PromoFlag price={row.public_price_idr} listPrice={row.list_price_idr} className="absolute left-0 top-0" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <p className="eyebrow text-crimson">{row.brand} · {row.origin}</p>
                      <h3 className="mt-2 font-display text-xl leading-snug text-ink">{row.name}</h3>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <PriceTag price={row.public_price_idr} listPrice={row.list_price_idr} size="sm" />
                      <ArrowRight className="h-5 w-5 text-crimson transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <SiteLayout>
      <CommercialHero />
      <AvailableNow />
      <ShopByCategory />
      <ShopByOrigin />
      <Recommendations />
      <BrandStrip />
      <Benefits />
      <Faq />
      <MarketInsights />
    </SiteLayout>
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

function Benefits() {
  const { t } = useLang();
  return (
    <section className="bg-noir text-bone">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <p className="eyebrow text-crimson">{t("home.benefits.eyebrow")}</p>
        <h2 className="mt-6 max-w-3xl font-display text-3xl sm:text-4xl lg:text-5xl">
          {t("home.benefits.title")}
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-bone/65">
          {t("home.benefits.body")}
        </p>


        <div className="mt-12 grid border-y border-white/10 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.key}
              className="group border-b border-white/10 py-8 last:border-b-0 md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0 md:[&:not(:last-child)]:border-r"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-crimson/40 text-crimson">
                <b.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="mt-6 font-display text-xl">
                {t(`home.benefit.${b.key}.title` as TKey)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-bone/65">
                {t(`home.benefit.${b.key}.body` as TKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function Faq() {
  const { t } = useLang();
  const [open, setOpen] = useState<string>("scale");

  const toggle = (key: string) => setOpen((current) => (current === key ? "" : key));

  const items = FAQ_JSONLD_KEYS.map(
    (key) => ({
      key,
      question: t(`home.faq.${key}.q` as TKey),
      answer: t(`home.faq.${key}.a` as TKey),
    }),
  );



  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="eyebrow text-crimson">{t("home.faq.eyebrow")}</p>
          <h2 className="mt-6 font-display text-3xl sm:text-4xl">
            {t("home.faq.title")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ash">
            {t("home.faq.body")}
          </p>
        </div>
        <div className="mt-12 grid items-start gap-3 lg:grid-cols-2">
          {items.map((item) => {
            const isOpen = open === item.key;
            return (
              <div
                key={item.key}
                className="border border-line bg-card transition-colors hover:border-ink/20"
              >
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 p-6 text-left"
                >
                  <span className="font-display text-lg leading-snug text-ink">{item.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-crimson transition-transform ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen ? (
                  <div className="px-6 pb-6">
                    <p className="text-sm leading-relaxed text-ash">{item.answer}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MarketInsights() {
  const { t } = useLang();
  const { data: items = [] } = useFeaturedInventory(3);
  if (items.length === 0) return null;
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <ShelfHeading
          eyebrow={t("home.insights.eyebrow")}
          title={t("home.insights.title")}
          to="/insights"
          linkLabel={t("home.insights.all")}
        />
        <div className="mt-10 grid gap-px border border-line bg-line lg:grid-cols-3">
          {items.map((item, index) => (
            <article key={item.id} className="bg-card">
              <div className="relative">
                <img
                  src={resolveProductImage(item.image_url, item.name, null, null, null, item.id, index)}
                  alt={item.name}
                  loading="lazy"
          decoding="async"
                  width={1200}
                  height={900}
                  className="h-52 w-full object-cover"
                />
                <ImageDisclaimer variant="overlay" className="absolute bottom-1.5 left-1.5 z-10" />
              </div>
              <div className="p-7">
                <p className="eyebrow text-crimson">{item.origin}</p>
                <h3 className="mt-4 font-display text-2xl leading-snug">{item.name}</h3>
                <dl className="mt-6 space-y-2 text-xs text-ash">
                  <div className="flex justify-between border-b border-line pb-2">
                    <dt>{t("home.insights.brand")}</dt>
                    <dd className="text-ink">{item.brand || "Meatlink select"}</dd>
                  </div>
                  <div className="flex justify-between border-b border-line pb-2">
                    <dt>{t("home.insights.avgWeight")}</dt>
                    <dd className="text-ink">{item.avg_weight_text ?? t("home.insights.onRequest")}</dd>
                  </div>
                  <div className="flex justify-between pt-1">
                    <dt>{t("home.insights.indicative")}</dt>
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
