import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GRADE_LABEL, type GradeBand } from "@/lib/meatlink/catalog";
import {
  type AnalysisDimension,
  useCatalogAnalysis,
} from "@/lib/meatlink/insights";
import { formatIdr } from "@/lib/meatlink/inventory";
import { useBi, useLang } from "@/lib/i18n";

const DIMENSIONS: AnalysisDimension[] = ["cut", "grade", "origin"];

function gradeLabel(value: string) {
  return GRADE_LABEL[value as GradeBand] ?? value;
}

function compactKg(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000 ? 1 : 0,
  }).format(value);
}

export function CatalogAnalysis() {
  const bi = useBi();
  const { lang } = useLang();
  const locale = lang === "en" ? "en-US" : "id-ID";
  const [dimension, setDimension] = useState<AnalysisDimension>("cut");
  const query = useCatalogAnalysis(dimension);
  const analysis = query.data;
  const topRows = useMemo(
    () => [...(analysis?.rows ?? [])]
      .sort((left, right) => {
        const demandDifference = (right.request_count ?? -1) - (left.request_count ?? -1);
        return demandDifference || right.stock_kg - left.stock_kg;
      })
      .slice(0, 5),
    [analysis],
  );
  const maxStock = useMemo(
    () => Math.max(...topRows.map((row) => row.stock_kg), 1),
    [topRows],
  );

  function demandSignal(requestCount: number | null, suppressed: boolean) {
    if (requestCount !== null && requestCount >= 6) return bi("Tinggi", "High");
    if (requestCount !== null && requestCount >= 3) return bi("Aktif", "Active");
    if (suppressed) return bi("Terbatas", "Limited");
    return bi("Belum terlihat", "Not yet visible");
  }

  return (
    <section id="analisis-katalog" className="border-y border-line bg-sand">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)] lg:items-end">
          <div>
            <p className="eyebrow text-crimson">{bi("Analisis katalog", "Catalog analysis")}</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
              {bi("Sinyal pasar yang perlu diketahui.", "Market signals worth knowing.")}
            </h2>
          </div>
          <p className="text-sm leading-7 text-ash">
            {bi(
              "Ringkasan harga, ketersediaan, dan arah permintaan dari katalog aktif Meatlink.",
              "A concise view of pricing, availability and demand direction across Meatlink's active catalog.",
            )}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-y border-line py-5">
          <div className="flex gap-px bg-line p-px" aria-label={bi("Kelompok analisis", "Analysis grouping") }>
            {DIMENSIONS.map((item) => (
              <Button
                key={item}
                type="button"
                variant="ghost"
                onClick={() => setDimension(item)}
                className={`h-10 rounded-none px-4 text-xs uppercase ${
                  dimension === item ? "bg-noir text-bone hover:bg-noir hover:text-bone" : "bg-card text-ink"
                }`}
              >
                {item === "cut" ? bi("Per cut", "By cut") : item === "grade" ? bi("Per grade", "By grade") : bi("Per origin", "By origin")}
              </Button>
            ))}
          </div>
          <p className="text-xs text-ash">{bi("5 kelompok utama", "Top 5 groups")}</p>
        </div>

        {query.isLoading ? (
          <div className="mt-8 h-72 animate-pulse border border-line bg-card" aria-label={bi("Memuat analisis", "Loading analysis")} />
        ) : query.isError ? (
          <div className="mt-8 border border-line bg-card p-8">
            <p className="font-semibold">{bi("Analisis belum dapat dimuat.", "Analysis could not be loaded.")}</p>
            <Button type="button" variant="outline" onClick={() => query.refetch()} className="mt-4 rounded-none">
              {bi("Coba lagi", "Try again")}
            </Button>
          </div>
        ) : analysis ? (
          <>
            <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              <Metric label={bi("SKU aktif", "Active SKUs")} value={analysis.summary.sku_count.toLocaleString(locale)} />
              <Metric label={bi("Stok tersedia", "Available stock")} value={`${compactKg(analysis.summary.stock_kg, locale)} kg`} />
              <Metric label={bi("Median harga", "Median price")} value={`${formatIdr(analysis.summary.median_price_idr)} / kg`} />
              <Metric
                label={bi("Permintaan 90 hari", "90-day demand")}
                value={analysis.summary.request_count === null ? bi("Data terbatas", "Limited data") : analysis.summary.request_count.toLocaleString(locale)}
                accent
              />
            </div>

            {topRows.length === 0 ? (
              <p className="mt-8 border border-line bg-card p-8 text-sm text-ash">
                {bi("Tidak ada data untuk kombinasi filter ini.", "No data matches this filter combination.")}
              </p>
            ) : (
              <div className="mt-8 overflow-hidden border border-line bg-card">
                <div className="hidden grid-cols-[minmax(12rem,1.4fr)_minmax(11rem,1fr)_9rem_9rem] gap-5 border-b border-line px-6 py-4 text-[10px] font-semibold uppercase text-ash md:grid">
                  <span>{dimension === "cut" ? bi("Cut", "Cut") : dimension === "grade" ? bi("Grade", "Grade") : bi("Origin", "Origin")}</span>
                  <span>{bi("Harga indikatif / kg", "Indicative price / kg")}</span>
                  <span>{bi("Stok", "Stock")}</span>
                  <span>{bi("Sinyal permintaan", "Demand signal")}</span>
                </div>
                <div className="divide-y divide-line">
                  {topRows.map((row) => (
                    <article key={row.label} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(12rem,1.4fr)_minmax(11rem,1fr)_9rem_9rem] md:items-center md:px-6">
                      <div>
                        <p className="font-display text-xl">{dimension === "grade" ? gradeLabel(row.label) : row.label}</p>
                        <div className="mt-3 h-1.5 w-full max-w-48 overflow-hidden bg-sand" aria-hidden="true">
                          <div className="h-full bg-crimson" style={{ width: `${Math.max(3, (row.stock_kg / maxStock) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{row.avg_price_idr ? `${formatIdr(row.avg_price_idr)} / kg` : "—"}</p>
                      </div>
                      <DataPoint label={bi("Stok", "Stock")} value={`${compactKg(row.stock_kg, locale)} kg`} />
                      <DataPoint
                        label={bi("Sinyal permintaan", "Demand signal")}
                        value={demandSignal(row.request_count, row.demand_suppressed)}
                        accent={row.request_count !== null && row.request_count >= 3}
                      />
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex max-w-3xl items-start gap-2 text-xs leading-6 text-ash">
            <BarChart3 className="mt-1 h-4 w-4 shrink-0 text-crimson" aria-hidden="true" />
            <p>{bi("Harga bersifat indikatif. Sinyal permintaan disajikan sebagai agregat untuk menjaga privasi pembeli.", "Prices are indicative. Demand signals are aggregated to protect buyer privacy.")}</p>
          </div>
          <Button asChild variant="outline" className="h-auto shrink-0 rounded-none px-5 py-3">
            <Link to="/produk">
              {bi("Lihat katalog terkait", "View related catalog")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 bg-card p-5 sm:p-6">
      <p className="eyebrow text-ash">{label}</p>
      <p className={`mt-3 break-words font-display text-2xl ${accent ? "text-crimson" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function DataPoint({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 md:block">
      <span className="text-[10px] font-semibold uppercase text-ash md:hidden">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${accent ? "text-crimson" : "text-ink"}`}>
        {accent ? <TrendingUp className="mr-1 inline h-4 w-4" aria-hidden="true" /> : null}{value}
      </span>
    </div>
  );
}