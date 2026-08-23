import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MarketInsight = {
  id: string;
  title: string;
  body: string;
  title_en: string | null;
  body_en: string | null;
  category: string;
  region: string;
  period_label: string | null;
  source: string;
  confidence: string;
  status: string;
  display_rank: number | null;
  data_refs: unknown;
  created_at: string;
  updated_at: string;
};

export const INSIGHT_CATEGORIES = [
  "demand",
  "pricing",
  "supply",
  "logistics",
  "regulation",
] as const;
export const INSIGHT_STATUSES = ["draft", "published", "archived"] as const;
export const INSIGHT_CONFIDENCE = ["low", "medium", "high"] as const;

export const INSIGHT_SELECT =
  "id,title,body,title_en,body_en,category,region,period_label,source,confidence,status,display_rank,data_refs,created_at,updated_at";

/** Fallback copy so the public page never renders empty. */
export const FALLBACK_NOTES: Pick<
  MarketInsight,
  "title" | "body" | "title_en" | "body_en" | "category" | "region"
>[] = [
  {
    title: "Permintaan Wagyu bergerak ke grade lebih tinggi",
    body: "Permintaan MB6+ kini lebih banyak daripada MB4-5 di restoran fine dining Jakarta. Ketersediaan paling cepat mengetat pada dua minggu terakhir setiap bulan.",
    title_en: "Wagyu demand keeps moving up-grade",
    body_en:
      "Requests for MB6+ now outnumber MB4-5 in Jakarta fine dining. Availability tightens fastest in the last two weeks of each month.",
    category: "demand",
    region: "Jakarta",
  },
  {
    title: "Program lamb lebih efisien dengan volume bulanan tetap",
    body: "Pembeli yang mengunci alokasi rack bulanan secara konsisten mendapat landed cost lebih baik daripada pemesanan ad-hoc.",
    title_en: "Lamb programmes favour fixed monthly volume",
    body_en:
      "Buyers locking a monthly rack allocation consistently land better landed cost than ad-hoc ordering.",
    category: "pricing",
    region: "Nasional",
  },
  {
    title: "Sourcing di Bali diuntungkan oleh pemasok kedua",
    body: "Jadwal pengiriman membuat sumber cadangan terverifikasi menjadi peningkatan keandalan terbesar bagi operator di pulau.",
    title_en: "Bali sourcing rewards a second supplier",
    body_en:
      "Freight timing makes a verified backup source the single biggest reliability upgrade for island operators.",
    category: "logistics",
    region: "Bali",
  },
];

/** Public read of admin-published sourcing notes. */
export function usePublishedInsights(limit = 9) {
  return useQuery({
    queryKey: ["market-insights", "published", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_insights")
        .select(INSIGHT_SELECT)
        .eq("status", "published")
        .order("display_rank", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as MarketInsight[];
    },
  });
}
