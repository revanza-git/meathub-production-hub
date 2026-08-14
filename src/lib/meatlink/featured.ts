import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import wagyuRibeye from "@/assets/feature-wagyu-ribeye.jpg";
import lambRack from "@/assets/feature-lamb-rack.jpg";
import tenderloin from "@/assets/feature-tenderloin.jpg";
import striploin from "@/assets/feature-striploin.jpg";
import shortRib from "@/assets/feature-short-rib.jpg";
import type { InventoryItem } from "./inventory";

/** Curated photography an admin can attach to a featured inventory item. */
export const FEATURE_IMAGES = [
  { key: "wagyu-ribeye", label: "Wagyu ribeye", src: wagyuRibeye },
  { key: "lamb-rack", label: "Lamb rack", src: lambRack },
  { key: "tenderloin", label: "Tenderloin", src: tenderloin },
  { key: "striploin", label: "Striploin", src: striploin },
  { key: "short-rib", label: "Short rib", src: shortRib },
] as const;

export const FEATURED_RANKS = [1, 2, 3, 4, 5] as const;

/** Resolves a stored image reference (preset key or absolute URL) to a src. */
export function resolveFeatureImage(value: string | null | undefined): string {
  if (!value) return FEATURE_IMAGES[0].src;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return FEATURE_IMAGES.find((i) => i.key === value)?.src ?? FEATURE_IMAGES[0].src;
}

export type FeaturedItem = Pick<
  InventoryItem,
  | "id"
  | "name"
  | "origin"
  | "brand"
  | "condition"
  | "avg_weight_text"
  | "sale_price_idr"
  | "qty_on_hand_kg"
  | "featured_rank"
  | "image_url"
>;

/** Public read of the admin-curated featured inventory, ordered 1 → 5. */
export function useFeaturedInventory(limit = 5) {
  return useQuery({
    queryKey: ["featured-inventory", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_inventory")
        .select(
          "id,name,origin,brand,condition,avg_weight_text,sale_price_idr,qty_on_hand_kg,featured_rank,image_url",
        )
        .not("featured_rank", "is", null)
        .eq("is_active", true)
        .order("featured_rank")
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as FeaturedItem[];
    },
  });
}
