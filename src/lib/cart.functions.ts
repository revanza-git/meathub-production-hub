import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CartItemRow = {
  id: string;
  offer_id: string;
  qty_kg: number;
  unit_price_snapshot: number;
  hold_expires_at: string;
  offer: {
    id: string;
    purchase_type: string;
    min_qty: number;
    qty_step: number;
    base_price_per_kg: number;
    product: { id: string; name: string; sku: string } | null;
    vendor: { id: string; display_name: string } | null;
  } | null;
};

export type CartView = {
  cart: {
    id: string;
    buyer_org_id: string;
    address_id: string | null;
    status: string;
    notes: string | null;
  } | null;
  items: CartItemRow[];
  totals: { subtotal: number; total_kg: number; shipping: number; tax: number; total: number };
};

function computeTotals(items: CartItemRow[]) {
  const subtotal = items.reduce((s, i) => s + Number(i.qty_kg) * Number(i.unit_price_snapshot), 0);
  const total_kg = items.reduce((s, i) => s + Number(i.qty_kg), 0);
  const shipping = total_kg >= 20 ? 0 : items.length ? 25000 : 0;
  const tax = Math.round(subtotal * 0.11 * 100) / 100;
  return { subtotal, total_kg, shipping, tax, total: subtotal + shipping + tax };
}

async function findBuyerOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, organizations!inner(type, status)")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .eq("organizations.type", "BUYER")
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

async function getOrCreateCart(supabase: any, userId: string, buyerOrgId: string) {
  const { data: existing } = await supabase
    .from("carts")
    .select("*")
    .eq("buyer_org_id", buyerOrgId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase
    .from("carts")
    .insert({ buyer_org_id: buyerOrgId, created_by: userId })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export const getMyCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CartView> => {
    const orgId = await findBuyerOrgId(context.supabase, context.userId);
    if (!orgId) return { cart: null, items: [], totals: computeTotals([]) };
    const cart = await getOrCreateCart(context.supabase, context.userId, orgId);
    const { data: items, error } = await context.supabase
      .from("cart_items")
      .select(
        "id, offer_id, qty_kg, unit_price_snapshot, hold_expires_at, offer:offer_id(id, purchase_type, min_qty, qty_step, base_price_per_kg, product:product_id(id, name, sku), vendor:vendor_id(id, display_name))",
      )
      .eq("cart_id", cart.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (items ?? []) as unknown as CartItemRow[];
    return { cart, items: rows, totals: computeTotals(rows) };
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ offer_id: z.string().uuid(), qty_kg: z.number().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const orgId = await findBuyerOrgId(context.supabase, context.userId);
    if (!orgId) throw new Error("Anda harus tergabung di organisasi Buyer");
    const { data: offer, error: offErr } = await context.supabase
      .from("vendor_offers")
      .select("id, base_price_per_kg, min_qty, qty_step, status")
      .eq("id", data.offer_id)
      .single();
    if (offErr || !offer) throw new Error("Offer tidak ditemukan");
    if (offer.status !== "ACTIVE") throw new Error("Offer tidak aktif");
    if (data.qty_kg < Number(offer.min_qty)) throw new Error(`Minimum ${offer.min_qty} kg`);
    const cart = await getOrCreateCart(context.supabase, context.userId, orgId);
    const { data: existing } = await context.supabase
      .from("cart_items")
      .select("id, qty_kg")
      .eq("cart_id", cart.id)
      .eq("offer_id", data.offer_id)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("cart_items")
        .update({
          qty_kg: Number(existing.qty_kg) + data.qty_kg,
          unit_price_snapshot: Number(offer.base_price_per_kg),
          hold_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("cart_items").insert({
        cart_id: cart.id,
        offer_id: data.offer_id,
        qty_kg: data.qty_kg,
        unit_price_snapshot: Number(offer.base_price_per_kg),
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ item_id: z.string().uuid(), qty_kg: z.number().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cart_items")
      .update({
        qty_kg: data.qty_kg,
        hold_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .eq("id", data.item_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ item_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cart_items").delete().eq("id", data.item_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCartAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ cart_id: z.string().uuid(), address_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("carts")
      .update({ address_id: data.address_id })
      .eq("id", data.cart_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkoutCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ notes: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: orderId, error } = await context.supabase.rpc("checkout_cart", {
      _notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { order_id: orderId as string };
  });
