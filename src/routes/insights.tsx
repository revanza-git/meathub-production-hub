import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Bot, Clock } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { ImageDisclaimer } from "@/components/site/image-disclaimer";
import { CatalogAnalysis } from "@/components/site/catalog-analysis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { resolveProductImage, useFeaturedInventory } from "@/lib/meatlink/featured";
import { formatIdr } from "@/lib/meatlink/inventory";
import { FALLBACK_NOTES, usePublishedInsights } from "@/lib/meatlink/insights";
import { pickLocale, useBi, useLang } from "@/lib/i18n";

type InsightNote = {
  title: string;
  body: string;
  title_en: string | null;
  body_en: string | null;
  category: string;
  region: string;
  period_label?: string | null;
};

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Analisis Harga, Stok & Permintaan — Meatlink.id" },
      {
        name: "description",
        content:
          "Sorotan pasar daging mingguan dari Meatlink: harga indikatif, pasokan, logistik, dan permintaan per cut, grade, serta origin.",
      },
      { property: "og:title", content: "Market Insights Daging — Meatlink.id" },
      {
        property: "og:description",
        content: "Temuan pasar daging terbaru dan analisis katalog berdasarkan cut, grade, dan origin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

const TOPIC: Record<string, { id: string; en: string; keyword: string }> = {
  pricing: { id: "Harga", en: "Pricing", keyword: "ribeye" },
  supply: { id: "Pasokan", en: "Supply", keyword: "striploin" },
  logistics: { id: "Logistik", en: "Logistics", keyword: "slice" },
  demand: { id: "Permintaan", en: "Demand", keyword: "tenderloin" },
};

function topicKey(category: string) {
  return category.trim().toLowerCase();
}

function readMinutes(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

function InsightsPage() {
  const bi = useBi();
  const { lang } = useLang();
  const { data: featured = [] } = useFeaturedInventory(4);
  const { data: published = [] } = usePublishedInsights(9);
  const notes: InsightNote[] = published.length > 0 ? published : FALLBACK_NOTES;
  const [activeNote, setActiveNote] = useState<InsightNote | null>(null);
  const [topic, setTopic] = useState<string>("all");

  const topicLabel = (category: string) => {
    const t = TOPIC[topicKey(category)];
    return t ? bi(t.id, t.en) : category;
  };
  const noteImage = (n: InsightNote, i: number) =>
    resolveProductImage(null, TOPIC[topicKey(n.category)]?.keyword ?? "ribeye", null, null, null, n.title, i);

  const topics = useMemo(() => Array.from(new Set(notes.map((n) => topicKey(n.category)))), [notes]);
  const [lead, ...rest] = notes;
  const filtered = topic === "all" ? rest : notes.filter((n) => topicKey(n.category) === topic);

  return (
    <SiteLayout>
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

      {/* Lead story */}
      <section className="bg-noir text-bone">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-14 lg:px-8 lg:pb-20">
          <p className="eyebrow text-crimson">{bi("Market insights · Sorotan minggu ini", "Market insights · This week's highlight")}</p>
          {lead ? (
            <button
              type="button"
              onClick={() => setActiveNote(lead)}
              className="group mt-8 grid w-full gap-8 text-left lg:grid-cols-[1.15fr_1fr] lg:items-center"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={noteImage(lead, 0)}
                  alt=""
                  width={1200}
                  height={750}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <ImageDisclaimer variant="overlay" className="absolute bottom-2 left-2 z-10" />
              </div>
              <div>
                <p className="eyebrow text-bone/60">
                  {topicLabel(lead.category)} · {lead.region}
                  {lead.period_label ? ` · ${lead.period_label}` : ""}
                </p>
                <h1 className="mt-4 line-clamp-4 font-display text-4xl leading-tight sm:text-5xl" lang={lang}>
                  {pickLocale(lang, lead.title, lead.title_en)}
                </h1>
                <p className="mt-5 line-clamp-3 text-base leading-7 text-bone/70" lang={lang}>
                  {pickLocale(lang, lead.body, lead.body_en)}
                </p>
                <span className="mt-7 inline-flex items-center gap-2 font-semibold text-crimson">
                  {bi("Baca sorotan", "Read highlight")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </button>
          ) : (
            <h1 className="mt-6 font-display text-5xl">{bi("Yang kami lihat di pasar daging.", "What we're seeing in the trade.")}</h1>
          )}
        </div>
      </section>

      {/* Article grid */}
      <section id="catatan-sourcing" className="scroll-mt-20 bg-bone">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl sm:text-4xl">{bi("Catatan pasar terbaru", "Latest market notes")}</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label={bi("Pilih topik", "Choose topic")}>
              {["all", ...topics].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  aria-pressed={topic === t}
                  className={`border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    topic === t ? "border-noir bg-noir text-bone" : "border-line bg-card text-ink hover:border-ink"
                  }`}
                >
                  {t === "all" ? bi("Semua", "All") : topicLabel(t)}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-10 border border-line bg-card p-6 text-sm text-ash">
              {bi("Belum ada catatan lain untuk topik ini.", "No other notes for this topic yet.")}
            </p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((n, i) => {
                const body = pickLocale(lang, n.body, n.body_en);
                return (
                  <button
                    key={n.title}
                    type="button"
                    onClick={() => setActiveNote(n)}
                    className="group flex flex-col border border-line bg-card text-left transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={noteImage(n, i + 1)}
                        alt=""
                        loading="lazy"
                        width={800}
                        height={500}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="eyebrow absolute left-3 top-3 bg-crimson px-2 py-1 text-bone">{topicLabel(n.category)}</span>
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="flex items-center gap-2 text-xs text-ash">
                        {n.region}
                        <span aria-hidden="true">·</span>
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {readMinutes(body)} {bi("mnt baca", "min read")}
                      </p>
                      <h3 className="mt-3 line-clamp-3 font-display text-xl leading-snug" lang={lang}>
                        {pickLocale(lang, n.title, n.title_en)}
                      </h3>
                      <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-crimson">
                        {bi("Baca analisis", "Read analysis")}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-6 flex items-center gap-1.5 text-[11px] italic text-ash">
            <Bot className="h-3 w-3" aria-hidden="true" />
            {bi("Catatan disusun dengan bantuan AI — verifikasi sebelum mengambil keputusan.", "Notes are AI-assisted — verify before deciding.")}
          </p>
        </div>
      </section>

      <CatalogAnalysis />

      {featured.length > 0 ? (
        <section className="bg-bone">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl">{bi("Baru disourcing", "Recently sourced")}</h2>
              <Link to="/produk" className="text-sm font-semibold text-crimson">{bi("Lihat katalog", "View catalog")} →</Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((item, index) => (
                <article key={item.id} className="border border-line bg-card">
                  <div className="relative">
                    <img
                      src={resolveProductImage(item.image_url, item.name, null, null, null, item.id, index)}
                      alt={item.name}
                      loading="lazy"
                      width={800}
                      height={600}
                      className="h-40 w-full object-cover"
                    />
                    <ImageDisclaimer variant="overlay" className="absolute bottom-1.5 left-1.5 z-10" />
                  </div>
                  <div className="p-5">
                    <p className="eyebrow text-crimson">{item.origin}</p>
                    <h3 className="mt-2 line-clamp-2 font-display text-lg leading-snug">{item.name}</h3>
                    <p className="mt-3 text-sm font-semibold text-ink">{formatIdr(item.public_price_idr)} / kg</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <Dialog open={activeNote !== null} onOpenChange={(open) => !open && setActiveNote(null)}>
        <DialogContent className="bottom-0 left-0 top-auto max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-none border-line bg-card p-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[86vh] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2">
          {activeNote ? (
            <article className="px-6 pb-8 pt-12 sm:px-12 sm:pb-12 sm:pt-14">
              <p className="eyebrow pr-8 text-crimson">
                {topicLabel(activeNote.category)} · {activeNote.region}
                {activeNote.period_label ? ` · ${activeNote.period_label}` : ""}
              </p>
              <DialogTitle className="mt-4 max-w-2xl font-display text-3xl font-normal leading-tight sm:text-4xl">
                {pickLocale(lang, activeNote.title, activeNote.title_en)}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {bi("Analisis pasar Meatlink selengkapnya", "Full Meatlink market analysis")}
              </DialogDescription>
              <p className="mt-7 whitespace-pre-line text-base leading-8 text-ash" lang={lang}>
                {pickLocale(lang, activeNote.body, activeNote.body_en)}
              </p>
              <div className="mt-8 flex items-start gap-2 border-t border-line pt-5 text-xs italic leading-relaxed text-ash">
                <Bot className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  {bi(
                    "Hasil analisis AI — verifikasi sebelum digunakan sebagai dasar keputusan pembelian.",
                    "AI-generated analysis — please verify before using it as a basis for purchasing decisions.",
                  )}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="h-auto rounded-none bg-crimson px-6 py-4 text-bone hover:bg-crimson-deep">
                  <Link to="/produk">{bi("Lihat produk terkait", "View related products")}</Link>
                </Button>
                <Button asChild variant="outline" className="h-auto rounded-none px-6 py-4">
                  <Link to="/request-quote">{bi("Minta penawaran", "Request a quote")}</Link>
                </Button>
              </div>
            </article>
          ) : null}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
