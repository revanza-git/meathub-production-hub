import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("ml_has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Hanya admin dapat memeriksa pembayaran.");
}

export const listReconciliations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    // Admin RLS protects the snapshot; no order access tokens or customer PII are returned.
    const { data, error } = await context.supabase.from("ml_payment_reconciliations")
      .select("order_id, payment_ref, transaction_id, gateway_status, gateway_amount, order_amount, order_status, transaction_time, settlement_time, result, reason, checked_at, storefront_orders!inner(order_no, created_at, paid_at)")
      .order("checked_at", { ascending: false }).limit(500);
    if (error) throw new Error("Hasil rekonsiliasi tidak dapat dimuat.");
    return data ?? [];
  });

export const checkReconciliationsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid().optional() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { checkReconciliation, reconcileDaily } = await import("./reconciliation.server");
    if (!data.orderId) return reconcileDaily(50);
    const { data: order, error } = await supabaseAdmin.from("storefront_orders")
      .select("id, order_no, status, total_idr, paid_at, payment_ref, payment_trx_id")
      .eq("id", data.orderId).single();
    if (error || !order?.payment_ref?.startsWith("Midtrans ")) throw new Error("Transaksi Midtrans tidak ditemukan.");
    return { result: await checkReconciliation(supabaseAdmin, order) };
  });