import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderRow = {
  id: string;
  order_no: string;
  buyer_org_id: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  total_kg: number;
  placed_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  offer_id: string;
  vendor_id: string;
  product_id: string;
  qty_kg: number;
  unit_price: number;
  line_total: number;
  vendor_status: "PENDING" | "CONFIRMED" | "REJECTED";
  vendor_reject_reason: string | null;
  vendor_decided_at: string | null;
  product?: { name: string; sku: string } | null;
  vendor?: { display_name: string } | null;
};

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderRow[]> => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, order_no, buyer_org_id, status, subtotal, shipping_fee, tax_amount, total_amount, total_kg, placed_at")
      .order("placed_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as OrderRow[];
  });

export const getOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*, address:address_id(label, address_line, city, service_zone)")
      .eq("id", data.order_id)
      .single();
    if (error) throw new Error(error.message);
    const { data: items, error: iErr } = await context.supabase
      .from("order_items")
      .select("*, product:product_id(name, sku), vendor:vendor_id(display_name)")
      .eq("order_id", data.order_id)
      .order("created_at");
    if (iErr) throw new Error(iErr.message);
    const { data: history } = await context.supabase
      .from("order_state_history")
      .select("*")
      .eq("order_id", data.order_id)
      .order("created_at", { ascending: false });
    return { order, items: (items ?? []) as unknown as OrderItemRow[], history: history ?? [] };
  });

export const listVendorOrderItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vendor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<OrderItemRow[]> => {
    const { data: rows, error } = await context.supabase
      .from("order_items")
      .select("*, product:product_id(name, sku), order:order_id(order_no, placed_at, status)")
      .eq("vendor_id", data.vendor_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as OrderItemRow[];
  });

export const decideOrderItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        item_id: z.string().uuid(),
        decision: z.enum(["CONFIRM", "REJECT"]),
        reason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("vendor_decide_order_item", {
      _item_id: data.item_id,
      _decision: data.decision,
      _reason: data.reason ?? undefined,
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ order_id: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_order", {
      _order_id: data.order_id,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
