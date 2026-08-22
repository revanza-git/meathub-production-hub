import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { resolveProductImage } from "@/lib/meatlink/featured";
import { formatIdr } from "@/lib/meatlink/inventory";
import { CATEGORY_LABEL, type CatalogRow } from "@/lib/meatlink/catalog";

/** Commerce product card — image, category, spec line and public price per kg. */
export function ProductCard({ row, headingLevel = "h2" }: { row: CatalogRow; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const specs = [row.brand, row.origin, row.condition].filter(Boolean).join(" · ");
  return (
    <Link
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
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <p className="eyebrow text-crimson">{CATEGORY_LABEL[row.category]}</p>
          <Heading className="mt-3 font-display text-xl leading-snug text-ink">{row.name}</Heading>
          {specs ? <p className="mt-2 text-sm text-ash">{specs}</p> : null}
          {row.avg_weight_text ? (
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ash">
              Berat rata-rata {row.avg_weight_text}
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <p className="font-display text-2xl text-ink">
            {formatIdr(row.public_price_idr)}
            <span className="text-sm text-ash"> /kg</span>
          </p>
          <ArrowRight className="h-5 w-5 text-ash transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
