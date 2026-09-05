import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { Bot, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/site/site-layout";
import { ImageDisclaimer } from "@/components/site/image-disclaimer";
import { resolveProductImage, useFeaturedInventory } from "@/lib/meatlink/featured";
import { formatIdr } from "@/lib/meatlink/inventory";
import { FALLBACK_NOTES, usePublishedInsights } from "@/lib/meatlink/insights";
import { pickLocale, useBi, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Market Insights — Meatlink.id meat sourcing intelligence" },
      {
        name: "description",
        content:
          "What Meatlink is seeing across the Indonesian meat trade: demand patterns, sourcing notes and recently matched requests.",
      },
      { property: "og:title", content: "Market Insights — Meatlink.id" },
      {
        property: "og:description",
        content: "Demand patterns and sourcing notes from the Indonesian meat trade.",
      },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const bi = useBi();
  const { lang } = useLang();
  const { data: featured = [] } = useFeaturedInventory(5);
  const { data: published = [] } = usePublishedInsights(9);
  const notes = published.length > 0 ? published : FALLBACK_NOTES;
  const trackRef = useRef<HTMLDivElement>(null);
  const notesTrackRef = useRef<HTMLDivElement>(null);

  function scrollByCards(ref: React.RefObject<HTMLDivElement | null>, direction: 1 | -1) {
    const track = ref.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : track.clientWidth;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow={bi("Market insights", "Market insights")}
        title={bi("Yang kami lihat di pasar daging.", "What we're seeing in the trade.")}
        intro={bi(
          "Catatan praktis dari permintaan yang bergerak lewat jaringan Meatlink — tanpa basa-basi, tanpa data hiasan.",
          "Practical notes from the requests moving through the Meatlink network — no fluff, no vanity data.",
        )}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: notes.map((n, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "BlogPosting",
                headline: pickLocale(lang, n.title, n.title_en),
                articleSection: n.category,
                description: pickLocale(lang, n.body, n.body_en).slice(0, 300),
                inLanguage: lang === "en" ? "en" : "id-ID",
                author: { "@type": "Organization", name: "Meatlink.id" },
                publisher: { "@type": "Organization", name: "Meatlink.id" },
                mainEntityOfPage: "https://meatlink.id/insights",
              },
            })),
          }),
        }}
      />

      <section className="bg-bone">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <p className="eyebrow text-crimson">{bi("Catatan sourcing", "Sourcing notes")}</p>
            {notes.length > 1 ? (
              <div className="flex gap-px bg-line">
                <button
                  type="button"
                  aria-label={bi("Catatan sebelumnya", "Previous notes")}
                  onClick={() => scrollByCards(notesTrackRef, -1)}
                  className="bg-card p-3 text-ink transition-colors hover:bg-noir hover:text-bone"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={bi("Catatan berikutnya", "Next notes")}
                  onClick={() => scrollByCards(notesTrackRef, 1)}
                  className="bg-card p-3 text-ink transition-colors hover:bg-noir hover:text-bone"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          <div
            ref={notesTrackRef}
            className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {notes.map((n) => (
              <article
                key={n.title}
                className="w-[85%] shrink-0 snap-start border border-line bg-card p-8 sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
              >
                <p className="eyebrow text-crimson">
                  {n.category} · {n.region}
                  {"period_label" in n && n.period_label ? ` · ${n.period_label}` : ""}
                </p>
                <h2 className="mt-3 font-display text-2xl leading-snug" lang={lang}>
                  {pickLocale(lang, n.title, n.title_en)}
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-ash" lang={lang}>
                  {pickLocale(lang, n.body, n.body_en)}
                </p>
                <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] italic text-ash/80">
                  <Bot className="h-3 w-3" aria-hidden="true" />
                  {bi(
                    "Hasil analisis AI — verifikasi sebelum digunakan sebagai dasar keputusan pembelian.",
                    "AI-generated analysis — please verify before using it as a basis for purchasing decisions.",
                  )}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-20 flex items-end justify-between gap-4">
            <p className="eyebrow text-crimson">{bi("Baru disourcing", "Recently sourced")}</p>
            {featured.length > 0 ? (
              <div className="flex gap-px bg-line">
                <button
                  type="button"
                  aria-label={bi("Item sebelumnya", "Previous items")}
                  onClick={() => scrollByCards(trackRef, -1)}
                  className="bg-card p-3 text-ink transition-colors hover:bg-noir hover:text-bone"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={bi("Item berikutnya", "Next items")}
                  onClick={() => scrollByCards(trackRef, 1)}
                  className="bg-card p-3 text-ink transition-colors hover:bg-noir hover:text-bone"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
          {featured.length === 0 ? (
            <p className="mt-10 border border-line bg-card p-6 text-sm text-ash">
              {bi(
                "Belum ada stok unggulan yang dipublikasikan — silakan cek kembali sebentar lagi.",
                "No featured stock published yet — check back shortly.",
              )}
            </p>
          ) : (
            <div
              ref={trackRef}
              className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {featured.map((item) => (
                <article
                  key={item.id}
                  className="w-[85%] shrink-0 snap-start border border-line bg-card sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
                >
                  <div className="relative">
                    <img
                      src={resolveProductImage(item.image_url, item.name, null, null, null, item.id)}
                      alt={item.name}
                      loading="lazy"
                      width={1200}
                      height={900}
                      className="h-48 w-full object-cover"
                    />
                    <ImageDisclaimer variant="overlay" className="absolute bottom-1.5 left-1.5 z-10" />
                  </div>
                  <div className="p-6">
                    <p className="eyebrow text-crimson">{item.origin}</p>
                    <h3 className="mt-3 font-display text-xl leading-snug">{item.name}</h3>
                    <dl className="mt-5 space-y-2 text-xs text-ash">
                      <div className="flex justify-between border-b border-line pb-2">
                        <dt>{bi("Brand", "Brand")}</dt>
                        <dd className="text-ink">{item.brand || "Meatlink select"}</dd>
                      </div>
                      <div className="flex justify-between border-b border-line pb-2">
                        <dt>{bi("Berat rata-rata", "Average weight")}</dt>
                        <dd className="text-ink">{item.avg_weight_text ?? bi("Atas permintaan", "On request")}</dd>
                      </div>
                      <div className="flex justify-between pt-1">
                        <dt>{bi("Harga indikatif", "Indicative price")}</dt>
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
          )}

          <div className="mt-14">
            <Link
              to="/request-quote"
              className="eyebrow inline-flex bg-crimson px-7 py-4 text-bone transition-colors hover:bg-crimson-deep"
            >
              {bi("Minta Penawaran", "Request a Quote")}
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
