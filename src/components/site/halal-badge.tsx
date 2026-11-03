import halalAsset from "@/assets/halal-indonesia.png.asset.json";

/**
 * Official "Halal Indonesia" mark (BPJPH, since 2022), rendered from a
 * transparent PNG. Meatlink holds a BPJPH halal certificate, so the mark may
 * be displayed. Keep the mark on a light background — its purple strokes are
 * unreadable on dark surfaces.
 */
export function HalalMark({ className }: { className?: string }) {
  return (
    <img
      src={halalAsset.url}
      alt="Halal Indonesia"
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
