import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OfferRow = {
  id: string;
  vendor_id: string;
  product_id: string;
  purchase_type: "LOAF" | "CARTON" | "RETAIL";
  base_price_per_kg: number;
  min_qty: number;
  qty_step: number;
  expected_min_kg: number | null;
  expected_max_kg: number | null;
  service_zones: string[];
  status: "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  effective_from: string | null;
  effective_to: string | null;
  product?: { name: string; sku: string; tier: string; status: string } | null;
  latest_inventory?: { available_kg: number; on_hand_kg: number; as_of: string } | null;
};

export const listVendorOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vendor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<OfferRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("vendor_offers")
      .select(
        "id, vendor_id, product_id, purchase_type, base_price_per_kg, min_qty, qty_step, expected_min_kg, expected_max_kg, service_zones, status, effective_from, effective_to, product:product_id(name, sku, tier, status)",
      )
      .eq("vendor_id", data.vendor_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const offers = (rows ?? []) as unknown as OfferRow[];
    if (offers.length === 0) return offers;

    const ids = offers.map((o) => o.id);
    const { data: inv } = await context.supabase
      .from("inventory_snapshots")
      .select("offer_id, available_kg, on_hand_kg, as_of")
      .in("offer_id", ids)
      .order("as_of", { ascending: false });
    const byOffer = new Map<string, { available_kg: number; on_hand_kg: number; as_of: string }>();
    for (const s of inv ?? []) if (!byOffer.has(s.offer_id)) byOffer.set(s.offer_id, s);
    return offers.map((o) => ({ ...o, latest_inventory: byOffer.get(o.id) ?? null }));
  });

const UpsertOffer = z.object({
  id: z.string().uuid().optional(),
  vendor_id: z.string().uuid(),
  product_id: z.string().uuid(),
  purchase_type: z.enum(["LOAF", "CARTON", "RETAIL"]),
  base_price_per_kg: z.number().int().nonnegative(),
  min_qty: z.number().positive(),
  qty_step: z.number().positive(),
  expected_min_kg: z.number().positive().optional(),
  expected_max_kg: z.number().positive().optional(),
  service_zones: z.array(z.enum(["JKT_INNER", "JKT_OUTER", "BODETABEK"])).min(1),
});
export const upsertOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertOffer.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("vendor_offers")
      .upsert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const transitionOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        to: z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.to === "ACTIVE") {
      // Require the product itself to be ACTIVE and at least one inventory snapshot.
      const { data: offer } = await context.supabase
        .from("vendor_offers")
        .select("product_id, products:product_id(status)")
        .eq("id", data.id)
        .maybeSingle();
      const prod = (offer as unknown as { products: { status: string } | null } | null)?.products;
      if (!prod || prod.status !== "ACTIVE")
        throw new Error("Parent product must be ACTIVE to publish the offer");
      const { count } = await context.supabase
        .from("inventory_snapshots")
        .select("id", { count: "exact", head: true })
        .eq("offer_id", data.id);
      if ((count ?? 0) < 1)
        throw new Error("Add at least one inventory snapshot before activating the offer");
    }
    const { error } = await context.supabase
      .from("vendor_offers")
      .update({ status: data.to })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        offer_id: z.string().uuid(),
        on_hand_kg: z.number().nonnegative(),
        available_kg: z.number().nonnegative(),
        pack_count: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.available_kg > data.on_hand_kg)
      throw new Error("Available kg cannot exceed on-hand kg");
    const { error } = await context.supabase.from("inventory_snapshots").insert({
      offer_id: data.offer_id,
      on_hand_kg: data.on_hand_kg,
      available_kg: data.available_kg,
      pack_count: data.pack_count ?? null,
      source: "portal",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
