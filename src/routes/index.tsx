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
import { CATEGORY_LABEL, useCatalog } from "@/lib/meatlink/catalog";
import { resolveProductImage, useFeaturedInventory } from "@/lib/meatlink/featured";
import { formatIdr } from "@/lib/meatlink/inventory";
import heroImg from "@/assets/hero-wagyu.jpg";
import { DICT, useLang, type TKey } from "@/lib/i18n";

const FAQ_JSONLD_KEYS = ["scale", "minimum", "coverage", "price", "top", "sourcing"] as const;

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

function HomePage() {
  return (
    <SiteLayout>
      <CommercialHero />
      <ShopByCategory />
      <AvailableNow />
      <Recommendations />
      <ShopByOrigin />
      <Benefits />
      <ProcurementPaths />
      <Faq />
      <MarketInsights />
    </SiteLayout>
  );
}

/** Compact commercial hero: B2B value proposition, working search and two buying paths. */
function CommercialHero() {
  const { t } = useLang();
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
      <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-center px-5 py-12 sm:min-h-[540px] lg:min-h-[570px] lg:px-8 lg:py-16">
        <div className="max-w-3xl fade-in-up">
          <p className="eyebrow text-crimson">{t("home.hero.eyebrow")}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
            {t("home.hero.title")}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-bone/75 sm:text-base">
            {t("home.hero.body")}
          </p>

          <CatalogSearch dark className="mt-7 max-w-2xl" />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/produk"
              className="eyebrow inline-flex min-h-12 items-center justify-center gap-2 bg-crimson px-6 py-3 text-bone transition-colors hover:bg-crimson-deep"
            >
              {t("home.hero.shop")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/request-quote"
              className="eyebrow inline-flex min-h-12 items-center justify-center gap-2 border border-white/30 px-6 py-3 text-bone transition-colors hover:bg-white/10"
            >
              {t("home.hero.quote")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-7 border-t border-white/15 pt-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-bone/50">
              {t("home.hero.audienceLabel")}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-bone/75">
              {AUDIENCES.map((audience) => (
                <span key={audience} className="inline-flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-crimson" aria-hidden="true" />
                  {t(`home.hero.audience.${audience}` as TKey)}
                </span>
              ))}
            </div>
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
  const { t } = useLang();
  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <ShelfHeading
          eyebrow={t("home.category.eyebrow")}
          title={t("home.category.title")}
          to="/produk"
          linkLabel={t("home.category.all")}
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
                {t("home.category.shop")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
  const { t } = useLang();
  const { data, isLoading } = useCatalog({ page: 1, pageSize: 8 });
  const rows = data?.rows ?? [];
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
                      src={resolveProductImage(row.image_url, row.name, row.category, row.grade_band, row.cut_type, row.slug ?? row.id)}
                      alt={row.name}
                      loading="lazy"
                      width={1024}
                      height={768}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <ImageDisclaimer variant="overlay" className="absolute bottom-1.5 left-1.5 z-10" />
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
  const { t } = useLang();
  const { data } = useCatalog({ page: 1, pageSize: 60 });
  const origins = Array.from(
    new Set((data?.rows ?? []).map((r) => r.origin).filter((o): o is string => Boolean(o))),
  ).slice(0, 8);
  if (origins.length === 0) return null;

  return (
    <section className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <ShelfHeading eyebrow={t("home.origin.eyebrow")} title={t("home.origin.title")} />
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


function ProcurementPaths() {
  const { t } = useLang();
  return (
    <section className="bg-sand">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="eyebrow text-crimson">{t("home.paths.eyebrow")}</p>
        <h2 className="mt-4 max-w-2xl font-display text-3xl sm:text-4xl">{t("home.paths.title")}</h2>
        <div className="mt-10 grid border-y border-line md:grid-cols-2">
          <div className="py-8 md:border-r md:border-line md:pr-10">
            <p className="eyebrow text-ash">{t("home.paths.standardLabel")}</p>
            <h3 className="mt-3 font-display text-2xl text-ink">{t("home.paths.standardTitle")}</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">{t("home.paths.standardBody")}</p>
            <Link
              to="/produk"
              className="eyebrow mt-6 inline-flex min-h-11 items-center gap-2 text-ink underline decoration-crimson decoration-2 underline-offset-8 transition-colors hover:text-crimson"
            >
              {t("home.paths.standardButton")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="border-t border-line py-8 md:border-t-0 md:pl-10">
            <p className="eyebrow text-crimson">{t("home.paths.customLabel")}</p>
            <h3 className="mt-3 font-display text-2xl text-ink">{t("home.paths.customTitle")}</h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">{t("home.paths.customBody")}</p>
            <Link
              to="/request-quote"
              className="eyebrow mt-6 inline-flex min-h-11 items-center gap-2 border border-ink px-6 py-3 text-ink transition-colors hover:bg-ink hover:text-bone"
            >
              {t("home.paths.customButton")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useLang();
  const [open, setOpen] = useState<string>("scale");

  const toggle = (key: string) => setOpen((current) => (current === key ? "" : key));

  const items = (["scale", "minimum", "coverage", "price", "top", "sourcing"] as const).map(
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
        <div className="mt-12 grid gap-3 lg:grid-cols-2">
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
          {items.map((item) => (
            <article key={item.id} className="bg-card">
              <div className="relative">
                <img
                  src={resolveProductImage(item.image_url, item.name, null, null, null, item.id)}
                  alt={item.name}
                  loading="lazy"
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
