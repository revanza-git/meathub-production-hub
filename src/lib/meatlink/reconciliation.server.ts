import { isMidtransPaid, getMidtransStatus, type MidtransTransaction } from "./midtrans.server";
import { reconcileMidtransClosure, reconcileMidtransPayment } from "./payment-status.server";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
type Order = { id: string; order_no: string; status: string; total_idr: number; paid_at: string | null; payment_ref: string | null; payment_trx_id: string | null };
type Result = "MATCHED" | "PENDING" | "REVIEW" | "FAILED";

function classify(order: Order, transaction: MidtransTransaction): { result: Result; reason: string | null } {
  if (transaction.order_id !== order.payment_ref?.slice(9) || transaction.transaction_id !== order.payment_trx_id)
    return { result: "REVIEW", reason: "ID transaksi tidak sesuai dengan percobaan pembayaran aktif." };
  if (!Number.isFinite(Number(transaction.gross_amount)) || Math.round(Number(transaction.gross_amount)) !== Math.round(Number(order.total_idr)))
    return { result: "REVIEW", reason: "Nominal Midtrans berbeda dari total pesanan." };
  if (isMidtransPaid(transaction))
    return order.paid_at && order.status !== "CANCELLED"
      ? { result: "MATCHED", reason: null }
      : { result: "REVIEW", reason: "Midtrans mencatat pembayaran berhasil tetapi pesanan belum lunas atau sudah dibatalkan." };
  if (["expire", "cancel", "deny"].includes(transaction.transaction_status))
    return order.status === "CANCELLED" && !order.paid_at
      ? { result: "MATCHED", reason: null }
      : { result: "REVIEW", reason: "Midtrans menutup transaksi tetapi pesanan belum dibatalkan atau sudah lunas." };
  if (order.paid_at || order.status === "CANCELLED")
    return { result: "REVIEW", reason: "Status pesanan bertentangan dengan transaksi Midtrans yang masih menunggu." };
  return { result: "PENDING", reason: null };
}

/** Verify the active attempt again before any state transition, then store a minimal comparison. */
export async function checkReconciliation(db: Admin, order: Order) {
  if (!order.payment_ref?.startsWith("Midtrans ")) return null;
  const previous = await db.from("ml_payment_reconciliations").select("result, payment_ref").eq("order_id", order.id).maybeSingle();
  let transaction: MidtransTransaction | null = null;
  let failure: string | null = null;
  try {
    transaction = await getMidtransStatus(order.payment_ref.slice(9));
  } catch (err) {
    console.error("[reconciliation] Midtrans unavailable", order.order_no, err);
    failure = "Status Midtrans tidak tersedia; periksa kembali nanti.";
  }
  // A payment attempt may have changed while Midtrans was responding.
  const { data: current, error } = await db.from("storefront_orders")
    .select("id, order_no, status, total_idr, paid_at, payment_ref, payment_trx_id")
    .eq("id", order.id).single();
  if (error || !current) throw new Error("Pesanan tidak dapat dibaca ulang.");
  if (current.payment_ref !== order.payment_ref || current.payment_trx_id !== order.payment_trx_id) return null;

  if (transaction) {
    // Safe helpers use transaction ID, amount, and active payment reference to guard updates.
    if (!(await reconcileMidtransPayment(current, transaction))) await reconcileMidtransClosure(current, transaction);
  }
  const latest = await db.from("storefront_orders").select("id, order_no, status, total_idr, paid_at, payment_ref, payment_trx_id").eq("id", order.id).single();
  if (latest.error || !latest.data) throw new Error("Hasil pesanan tidak dapat dibaca.");
  const updated = latest.data;
  if (updated.payment_ref !== order.payment_ref || updated.payment_trx_id !== order.payment_trx_id) return null;
  const verdict = transaction ? classify(updated, transaction) : { result: "FAILED" as Result, reason: failure };
  const { error: saveError } = await db.from("ml_payment_reconciliations").upsert({
    order_id: order.id, payment_ref: order.payment_ref, transaction_id: transaction?.transaction_id ?? order.payment_trx_id,
    gateway_status: transaction?.transaction_status ?? null,
    gateway_amount: transaction && Number.isFinite(Number(transaction.gross_amount)) ? Number(transaction.gross_amount) : null,
    order_amount: Number(updated.total_idr), order_status: updated.status,
    transaction_time: transaction?.transaction_time ?? null,
    settlement_time: transaction?.settlement_time ?? null,
    result: verdict.result, reason: verdict.reason, checked_at: new Date().toISOString(),
  }, { onConflict: "order_id" });
  if (saveError) throw new Error(saveError.message);
  if (verdict.result === "REVIEW" && (previous.data?.result !== "REVIEW" || previous.data.payment_ref !== order.payment_ref)) {
    try {
      const { sendOpsAlert } = await import("./ops-notify.server");
      await sendOpsAlert({ subject: `Periksa pembayaran ${order.order_no} — Meatlink`, heading: "Selisih pembayaran", intro: verdict.reason ?? "Pembayaran perlu diperiksa.",
        stats: [{ label: "Pesanan", value: order.order_no }], listTitle: "Tindak lanjut", list: [],
        ctaUrl: "https://meatlink.id/admin/storefront-orders", ctaLabel: "Lihat rekonsiliasi" },
      `reconciliation-${order.id}-${order.payment_ref}`);
    } catch (err) { console.error("[reconciliation] alert failed", err); }
  }
  return verdict.result;
}

/** Bounded daily pass: scan pages until finding unchecked attempts, including pages beyond the first 200. */
export async function reconcileDaily(limit = 80) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  let checked = 0, failed = 0, review = 0, scanned = 0;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  let offset = 0;
  while (checked < limit && scanned < 10000) {
    let query = db.from("storefront_orders")
      .select("id, order_no, status, total_idr, paid_at, payment_ref, payment_trx_id, created_at")
      .like("payment_ref", "Midtrans %")
      .order("created_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + 199);
    const { data: page, error } = await query;
    if (error) throw new Error(error.message);
    if (!page?.length) break;
    scanned += page.length;
    const ids = page.map((row) => row.id);
    const { data: snapshots, error: snapshotError } = await db.from("ml_payment_reconciliations")
      .select("order_id, payment_ref, checked_at").in("order_id", ids);
    if (snapshotError) throw new Error(snapshotError.message);
    const byId = new Map((snapshots ?? []).map((s) => [s.order_id, s]));
    for (const row of page) {
      if (checked >= limit) break;
      const snapshot = byId.get(row.id);
      if (snapshot?.payment_ref === row.payment_ref && new Date(snapshot.checked_at).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }) === today) continue;
      try {
        const result = await checkReconciliation(db, row);
        if (result) { checked++; if (result === "FAILED") failed++; if (result === "REVIEW") review++; }
      } catch (err) { failed++; console.error("[reconciliation] order failed", row.order_no, err); }
    }
    offset += page.length;
    if (page.length < 200) break;
  }
  return { checked, failed, review, scanned };
}