import { formatIdr } from "@/lib/meatlink/inventory";

type Size = "sm" | "md" | "lg";

const PRICE_CLASS: Record<Size, string> = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
};

const UNIT_CLASS: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/** Public price per kg, with the list price struck through while a promo runs. */
export function PriceTag({
  price,
  listPrice,
  size = "md",
  className = "",
}: {
  price: number | string;
  listPrice?: number | string | null;
  size?: Size;
  className?: string;
}) {
  const value = Number(price);
  const list = Number(listPrice ?? 0);
  const onPromo = Number.isFinite(list) && list > 0 && value > 0 && list > value;

  return (
    <div className={className}>
      {onPromo ? (
        <p className={`${UNIT_CLASS[size]} text-ash line-through`}>{formatIdr(list)}</p>
      ) : null}
      <p className={`font-display ${PRICE_CLASS[size]} ${onPromo ? "text-crimson" : "text-ink"}`}>
        {formatIdr(value)}
        <span className={`${UNIT_CLASS[size]} text-ash`}> /kg</span>
      </p>
    </div>
  );
}

/** Small "Hemat 12%" flag shown on cards and product pages during a promo. */
export function PromoFlag({
  price,
  listPrice,
  className = "",
}: {
  price: number | string;
  listPrice?: number | string | null;
  className?: string;
}) {
  const value = Number(price);
  const list = Number(listPrice ?? 0);
  if (!(list > 0 && value > 0 && list > value)) return null;
  const off = Math.round(((list - value) / list) * 100);
  return (
    <span
      className={`eyebrow inline-block bg-crimson px-2 py-1 text-[0.6rem] text-bone ${className}`}
    >
      Promo −{off}%
    </span>
  );
}
