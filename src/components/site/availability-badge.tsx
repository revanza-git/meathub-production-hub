import { AVAILABILITY_LABEL, type Availability } from "@/lib/meatlink/catalog";

const TONE: Record<Availability, string> = {
  IN_STOCK: "bg-ink text-bone",
  LIMITED: "bg-crimson text-bone",
  PRE_ORDER: "bg-bone text-ink",
};

/** Stock badge driven by the real availability computed from qty on hand. */
export function AvailabilityBadge({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const key = (value as Availability) in AVAILABILITY_LABEL ? (value as Availability) : null;
  return (
    <span
      className={`eyebrow absolute left-4 top-4 px-3 py-1.5 text-[0.65rem] ${
        key ? TONE[key] : "bg-ink text-bone"
      } ${className}`}
    >
      {key ? AVAILABILITY_LABEL[key] : value}
    </span>
  );
}
