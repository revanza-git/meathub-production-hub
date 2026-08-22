import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import wagyuRibeye from "@/assets/feature-wagyu-ribeye.jpg";
import lambRack from "@/assets/feature-lamb-rack.jpg";
import tenderloin from "@/assets/feature-tenderloin.jpg";
import striploin from "@/assets/feature-striploin.jpg";
import shortRib from "@/assets/feature-short-rib.jpg";
import offal from "@/assets/feature-offal.jpg";
import bone from "@/assets/feature-bone.jpg";
import type { InventoryItem } from "./inventory";

/** Curated photography an admin can attach to a featured inventory item. */
export const FEATURE_IMAGES = [
  { key: "wagyu-ribeye", label: "Wagyu ribeye", src: wagyuRibeye },
  { key: "lamb-rack", label: "Lamb rack", src: lambRack },
  { key: "tenderloin", label: "Tenderloin", src: tenderloin },
  { key: "striploin", label: "Striploin", src: striploin },
  { key: "short-rib", label: "Short rib", src: shortRib },
  { key: "offal", label: "Offal", src: offal },
  { key: "bone", label: "Bone", src: bone },
] as const;

export const FEATURED_RANKS = [1, 2, 3, 4, 5] as const;

/** Resolves a stored image reference (preset key or absolute URL) to a src. */
export function resolveFeatureImage(value: string | null | undefined): string {
  if (!value) return FEATURE_IMAGES[0].src;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return FEATURE_IMAGES.find((i) => i.key === value)?.src ?? FEATURE_IMAGES[0].src;
}

/** Best-effort catalog artwork: explicit image first, then a name/category match. */
export function resolveProductImage(
  imageUrl: string | null | undefined,
  name: string | null | undefined,
  category: string | null | undefined,
): string {
  if (imageUrl) return resolveFeatureImage(imageUrl);
  const n = (name ?? "").toLowerCase();
  const byName = [
    ["wagyu", "wagyu-ribeye"],
    ["ribeye", "wagyu-ribeye"],
    ["cube roll", "wagyu-ribeye"],
    ["tenderloin", "tenderloin"],
    ["striploin", "striploin"],
    ["sirloin", "striploin"],
    ["short rib", "short-rib"],
    ["rib", "short-rib"],
    ["lamb", "lamb-rack"],
    ["domba", "lamb-rack"],
  ] as const;
  const hit = byName.find(([needle]) => n.includes(needle));
  if (hit) return resolveFeatureImage(hit[1]);
  if (category === "OFFAL") return resolveFeatureImage("offal");
  if (category === "BONE") return resolveFeatureImage("bone");
  if (category === "SECOND_CUT") return resolveFeatureImage("short-rib");
  return resolveFeatureImage("striploin");
}


export type FeaturedItem = Pick<
  InventoryItem,
  "id" | "name" | "origin" | "brand" | "condition" | "avg_weight_text" | "featured_rank" | "image_url"
> & {
  /** Final public price per kg (promo price when active), computed server-side. */
  public_price_idr: number;
  /** Normal price per kg before any promo. */
  list_price_idr: number;
};

/** Public read of the admin-curated featured inventory, ordered 1 → 5.
 *  Uses a safe RPC so internal cost and stock figures never leave the server. */
export function useFeaturedInventory(limit = 5) {
  return useQuery({
    queryKey: ["featured-inventory", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ml_public_featured", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as unknown as FeaturedItem[];
    },
  });
}

