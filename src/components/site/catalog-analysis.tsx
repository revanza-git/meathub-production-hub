import { useMemo, useState } from "react";
import { BarChart3, RotateCcw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GRADE_LABEL, type GradeBand } from "@/lib/meatlink/catalog";
import {
  type AnalysisDimension,
  type CatalogAnalysisFilters,
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
  const [filters, setFilters] = useState<CatalogAnalysisFilters>({});
  const query = useCatalogAnalysis(dimension, filters);
  const analysis = query.data;
  const maxStock = useMemo(
    () => Math.max(...(analysis?.rows.map((row) => row.stock_kg) ?? [0]), 1),
    [analysis],
  );
  const hasFilters = Boolean(filters.cut || filters.grade || filters.origin);

  function setFilter(key: keyof CatalogAnalysisFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  }

  return (
    <section id="analisis-katalog" className="border-y border-line bg-sand">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)] lg:items-end">
          <div>
            <p className="eyebrow text-crimson">{bi("Analisis katalog", "Catalog analysis")}</p>
            <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
              {bi("Harga, stok, dan permintaan dalam satu pandangan.", "Price, stock and demand in one view.")}
            </h2>
          </div>
          <p className="text-sm leading-7 text-ash">
            {bi(
              "Bandingkan katalog aktif berdasarkan cut, grade, dan origin. Permintaan memakai agregat 90 hari terakhir.",
              "Compare the active catalog by cut, grade and origin. Demand uses 90-day aggregates.",
            )}
          </p>
        </div>

        <div className="mt-10 grid gap-4 border-y border-line py-6 sm:grid-cols-3">
          <FilterSelect
            label={bi("Cut", "Cut")}
            value={filters.cut ?? ""}
            options={analysis?.facets.cuts ?? []}
            onChange={(value) => setFilter("cut", value)}
            allLabel={bi("Semua cut", "All cuts")}
          />
          <FilterSelect
            label={bi("Grade", "Grade")}
            value={filters.grade ?? ""}
            options={analysis?.facets.grades ?? []}
            formatOption={gradeLabel}
            onChange={(value) => setFilter("grade", value)}
            allLabel={bi("Semua grade", "All grades")}
          />
          <FilterSelect
            label={bi("Origin", "Origin")}
            value={filters.origin ?? ""}
            options={analysis?.facets.origins ?? []}
            onChange={(value) => setFilter("origin", value)}
            allLabel={bi("Semua origin", "All origins")}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
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
          {hasFilters ? (
            <Button type="button" variant="ghost" onClick={() => setFilters({})} className="rounded-none text-ash">
              <RotateCcw aria-hidden="true" />
              {bi("Reset filter", "Reset filters")}
            </Button>
          ) : null}
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

            {analysis.rows.length === 0 ? (
              <p className="mt-8 border border-line bg-card p-8 text-sm text-ash">
                {bi("Tidak ada data untuk kombinasi filter ini.", "No data matches this filter combination.")}
              </p>
            ) : (
              <div className="mt-8 overflow-hidden border border-line bg-card">
                <div className="hidden grid-cols-[minmax(12rem,1.4fr)_minmax(13rem,1.5fr)_8rem_6rem_8rem] gap-5 border-b border-line px-6 py-4 text-[10px] font-semibold uppercase text-ash lg:grid">
                  <span>{dimension === "cut" ? bi("Cut", "Cut") : dimension === "grade" ? bi("Grade", "Grade") : bi("Origin", "Origin")}</span>
                  <span>{bi("Harga indikatif / kg", "Indicative price / kg")}</span>
                  <span>{bi("Stok", "Stock")}</span>
                  <span>SKU</span>
                  <span>{bi("Permintaan", "Demand")}</span>
                </div>
                <div className="divide-y divide-line">
                  {analysis.rows.map((row) => (
                    <article key={row.label} className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(12rem,1.4fr)_minmax(13rem,1.5fr)_8rem_6rem_8rem] lg:items-center lg:px-6">
                      <div>
                        <p className="font-display text-xl">{dimension === "grade" ? gradeLabel(row.label) : row.label}</p>
                        <div className="mt-3 h-1.5 w-full max-w-48 overflow-hidden bg-sand" aria-hidden="true">
                          <div className="h-full bg-crimson" style={{ width: `${Math.max(3, (row.stock_kg / maxStock) * 100)}%` }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{row.avg_price_idr ? `${formatIdr(row.avg_price_idr)} / kg` : "—"}</p>
                        <p className="mt-1 text-xs text-ash">
                          {row.min_price_idr && row.max_price_idr ? `${formatIdr(row.min_price_idr)} – ${formatIdr(row.max_price_idr)}` : bi("Belum ada harga", "No price yet")}
                        </p>
                      </div>
                      <DataPoint label={bi("Stok", "Stock")} value={`${compactKg(row.stock_kg, locale)} kg`} />
                      <DataPoint label="SKU" value={row.sku_count.toLocaleString(locale)} />
                      <DataPoint
                        label={bi("Permintaan", "Demand")}
                        value={row.request_count === null ? (row.demand_suppressed ? "< 3" : "—") : row.request_count.toLocaleString(locale)}
                        accent={row.request_count !== null && row.request_count >= 3}
                      />
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        <div className="mt-5 flex items-start gap-2 text-xs leading-6 text-ash">
          <BarChart3 className="mt-1 h-4 w-4 shrink-0 text-crimson" aria-hidden="true" />
          <p>{bi("Harga adalah indikasi katalog saat ini. Angka permintaan di bawah tiga disamarkan untuk menjaga privasi pembeli.", "Prices reflect current catalog indications. Demand below three requests is obscured to protect buyer privacy.")}</p>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({ label, value, options, onChange, allLabel, formatOption = (option) => option }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  allLabel: string;
  formatOption?: (option: string) => string;
}) {
  return (
    <label className="grid gap-2">
      <span className="eyebrow text-ash">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full border border-line bg-card px-4 text-sm text-ink outline-none focus:border-crimson focus:ring-1 focus:ring-crimson">
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option} value={option}>{formatOption(option)}</option>)}
      </select>
    </label>
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
    <div className="flex items-center justify-between gap-4 lg:block">
      <span className="text-[10px] font-semibold uppercase text-ash lg:hidden">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${accent ? "text-crimson" : "text-ink"}`}>
        {accent ? <TrendingUp className="mr-1 inline h-4 w-4" aria-hidden="true" /> : null}{value}
      </span>
    </div>
  );
}