import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UNIT_MARGIN_IDR, parseUnitMargins, type UnitMargins } from "@/lib/meatlink/inventory";

export const UNIT_MARGINS_QUERY_KEY = ["unit-margins"] as const;

export async function fetchUnitMargins(): Promise<UnitMargins> {
  const { data, error } = await supabase.rpc("ml_unit_margins");
  if (error) return UNIT_MARGIN_IDR;
  return parseUnitMargins(data);
}

/** Admin-configurable margin per purchase unit, with a static fallback. */
export function useUnitMargins(): UnitMargins {
  const { data } = useQuery({
    queryKey: UNIT_MARGINS_QUERY_KEY,
    queryFn: fetchUnitMargins,
    staleTime: 5 * 60_000,
  });
  return data ?? UNIT_MARGIN_IDR;
}
