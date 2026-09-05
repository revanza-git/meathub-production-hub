import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { PriceTag, PromoFlag } from "@/components/site/price-tag";
import { ImageDisclaimer } from "@/components/site/image-disclaimer";
import { resolveProductImage } from "@/lib/meatlink/featured";
import { CATEGORY_LABEL, gradeLabel, type CatalogRow } from "@/lib/meatlink/catalog";
import { channelsBadge } from "@/lib/meatlink/shop-mode";

/** Commerce product card — image, category, spec line and public price per kg. */
export function ProductCard({ row, headingLevel = "h2" }: { row: CatalogRow; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const specs = [row.brand, row.origin, row.condition].filter(Boolean).join(" · ");
  const grade = gradeLabel(row.grade_band);
  return (
    <Link
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
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow text-crimson">{CATEGORY_LABEL[row.category]}</p>
            {row.cut_type && row.cut_type !== "Lainnya" ? (
              <span className="text-xs uppercase tracking-[0.14em] text-ash">· {row.cut_type}</span>
            ) : null}
          </div>
          {grade ? (
            <span className="mt-3 inline-block border border-line px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-ink">
              {grade}
            </span>
          ) : null}
          <Heading className="mt-3 font-display text-xl leading-snug text-ink">{row.name}</Heading>
          {specs ? <p className="mt-2 text-sm text-ash">{specs}</p> : null}
          {row.avg_weight_text && row.avg_weight_text.toUpperCase() !== "N/A" ? (
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ash">
              Berat rata-rata {row.avg_weight_text}
            </p>
          ) : null}
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-ash/80">
            {channelsBadge(row.sale_channels).id}
          </p>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <PriceTag price={row.public_price_idr} listPrice={row.list_price_idr} />
          <ArrowRight className="h-5 w-5 text-ash transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
