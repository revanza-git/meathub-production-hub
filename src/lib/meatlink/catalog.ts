import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProductCategory = Database["public"]["Enums"]["ml_product_category"];

/** The four canonical Meatlink categories, in display order. */
export const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "PRIME_CUT", label: "Prime Cut" },
  { value: "SECOND_CUT", label: "Second Cut" },
  { value: "OFFAL", label: "Offal" },
  { value: "BONE", label: "Bone" },
];

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  PRIME_CUT: "Prime Cut",
  SECOND_CUT: "Second Cut",
  OFFAL: "Offal",
  BONE: "Bone",
};

export type Availability = "IN_STOCK" | "LIMITED" | "PRE_ORDER";

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  IN_STOCK: "Ready stok",
  LIMITED: "Stok terbatas",
  PRE_ORDER: "Pre-order",
};

export type CatalogRow =
  Database["public"]["Functions"]["ml_public_catalog"]["Returns"][number];
export type CatalogProduct =
  Database["public"]["Functions"]["ml_public_product"]["Returns"][number];

export type CatalogSort = "featured" | "price_asc" | "price_desc" | "name_asc" | "newest";

export const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "featured", label: "Unggulan" },
  { value: "price_asc", label: "Harga terendah" },
  { value: "price_desc", label: "Harga tertinggi" },
  { value: "name_asc", label: "Nama A–Z" },
  { value: "newest", label: "Terbaru" },
];

export type CatalogFilters = {
  search?: string;
  category?: ProductCategory | null;
  origin?: string | null;
  origins?: string[];
  brands?: string[];
  conditions?: string[];
  availability?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: CatalogSort;
  promoOnly?: boolean;
  page?: number;
  pageSize?: number;
};


/** True when a catalog/product row is currently sold below its list price. */
export function isPromo(row: { public_price_idr: number | string; list_price_idr?: number | string | null }) {
  const price = Number(row.public_price_idr);
  const list = Number(row.list_price_idr ?? 0);
  return list > 0 && price > 0 && list > price;
}

/** Sanitized public catalog listing — no internal cost, markup or exact stock. */
export function useCatalog(filters: CatalogFilters = {}) {
  const {
    search = "",
    category = null,
    origin = null,
    promoOnly = false,
    page = 1,
    pageSize = 24,
  } = filters;
  return useQuery({
    queryKey: ["ml-catalog", search, category, origin, promoOnly, page, pageSize],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ml_public_catalog", {
        _search: search || undefined,
        _category: category ?? undefined,
        _origin: origin ?? undefined,
        _promo_only: promoOnly,
        _limit: pageSize,
        _offset: (page - 1) * pageSize,
      });
      if (error) throw error;
      const rows = (data ?? []) as CatalogRow[];
      return { rows, total: Number(rows[0]?.total_count ?? 0) };
    },
  });
}

/** Sanitized public product detail by slug. */
export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["ml-product", slug],
    enabled: Boolean(slug),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ml_public_product", { _slug: slug });
      if (error) throw error;
      return ((data ?? []) as CatalogProduct[])[0] ?? null;
    },
  });
}
