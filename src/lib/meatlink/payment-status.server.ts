import { isMidtransPaid, type MidtransTransaction } from "./midtrans.server";

/** Only a matching active Midtrans attempt may change a storefront order. */
export async function reconcileMidtransPayment(
  order: { id: string; order_no: string; status: string; total_idr: number; paid_at: string | null; payment_trx_id: string | null; payment_ref: string | null },
  transaction: MidtransTransaction,
) {
  const expectedOrderId = order.payment_ref?.startsWith("Midtrans ") ? order.payment_ref.slice(9) : null;
  if (!expectedOrderId || transaction.order_id !== expectedOrderId || transaction.transaction_id !== order.payment_trx_id ||
    Math.round(Number(transaction.gross_amount)) !== Math.round(Number(order.total_idr))) {
    return false;
  }
  if (!isMidtransPaid(transaction) || order.paid_at || !["NEW", "AWAITING_PAYMENT"].includes(order.status)) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("storefront_orders")
    .update({ status: "PAID", paid_at: new Date().toISOString() })
    .eq("id", order.id).eq("payment_trx_id", transaction.transaction_id)
    .is("paid_at", null).in("status", ["NEW", "AWAITING_PAYMENT"])
    .select("id").maybeSingle();
  if (error) throw error;
  if (!data) return false;
  await supabaseAdmin.from("storefront_order_events").insert({
    order_id: order.id, from_status: order.status, to_status: "PAID",
    note: `Pembayaran Midtrans sandbox terverifikasi (${transaction.transaction_id})`,
  });
  try {
    const { sendOrderEmail } = await import("./notify.server");
    await sendOrderEmail(order.order_no, "paid");
  } catch (err) {
    console.error("[notify] paid email failed", err);
  }
  return true;
}