import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MarketInsight = {
  id: string;
  title: string;
  body: string;
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
  "id,title,body,category,region,period_label,source,confidence,status,display_rank,data_refs,created_at,updated_at";

/** Fallback copy so the public page never renders empty. */
export const FALLBACK_NOTES: Pick<MarketInsight, "title" | "body" | "category" | "region">[] = [
  {
    title: "Wagyu demand keeps moving up-grade",
    body: "Requests for MB6+ now outnumber MB4-5 in Jakarta fine dining. Availability tightens fastest in the last two weeks of each month.",
    category: "demand",
    region: "Jakarta",
  },
  {
    title: "Lamb programmes favour fixed monthly volume",
    body: "Buyers locking a monthly rack allocation consistently land better landed cost than ad-hoc ordering.",
    category: "pricing",
    region: "Nasional",
  },
  {
    title: "Bali sourcing rewards a second supplier",
    body: "Freight timing makes a verified backup source the single biggest reliability upgrade for island operators.",
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
