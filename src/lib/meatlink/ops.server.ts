/**
 * Meatlink ops automation — server only.
 *
 * Three unattended jobs, all driven by the `/api/public/ops/cron` endpoint:
 *  1. expire-unpaid  — cancels unpaid orders past the admin-configured window
 *  2. low-stock      — emails ops when published items fall to/below the threshold
 *  3. daily-digest   — one summary email per Jakarta day
 *
 * Runs are recorded in `ops_job_runs` so a repeated call in the same window
 * does not re-send an email. Never import from client code.
 */

import { sendOpsAlert } from "./ops-notify.server";

const SITE = "https://meatlink.id";

const idr = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/** Current date in Asia/Jakarta as YYYY-MM-DD. */
function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function jakartaYesterday(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
}

function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(
    new Date(`${day}T06:00:00+07:00`),
  );
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function settings(db: Admin) {
  const { data } = await db.from("admin_settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key as string, r.value as unknown]));
  const num = (k: string, fallback: number) => {
    const v = Number(map.get(k));
    return Number.isFinite(v) ? v : fallback;
  };
  const bool = (k: string, fallback: boolean) => {
    const v = map.get(k);
    return typeof v === "boolean" ? v : fallback;
  };
  const str = (k: string) => {
    const v = map.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  return {
    alertEmail: str("ops_alert_email"),
    lowStockKg: num("inventory_low_stock_kg", 10),
    lowStockEnabled: bool("ops_low_stock_alert_enabled", true),
    digestEnabled: bool("ops_daily_digest_enabled", true),
    expiryHours: num("order_expiry_hours", 48),
  };
}

/** Records a run; returns false when the same job+key already ran. */
async function claim(db: Admin, job: string, runKey: string, detail: Record<string, unknown>) {
  const { error } = await db.from("ops_job_runs").insert({ job, run_key: runKey, detail: detail as never });
  if (error) return false;
  return true;
}

export async function expireUnpaidOrders() {
  const db = await admin();
  // Midtrans is authoritative: verify the current attempt before closing an order.
  // A delayed successful notification must not lose to the expiry sweep.
  const { data: candidates, error: lookupError } = await db.from("storefront_orders")
    .select("id, order_no, status, total_idr, paid_at, payment_trx_id, payment_ref, payment_expires_at")
    .in("status", ["NEW", "AWAITING_PAYMENT"])
    .is("paid_at", null)
    .like("payment_ref", "Midtrans %")
    .lt("payment_expires_at", new Date().toISOString())
    .order("payment_expires_at", { ascending: true })
    .limit(100);
  if (lookupError) throw new Error(lookupError.message);
  const { getMidtransStatus } = await import("./midtrans.server");
  const { reconcileMidtransPayment } = await import("./payment-status.server");
  let midtransExpired = 0;
  for (const order of candidates ?? []) {
    const reference = order.payment_ref?.slice(9);
    if (!reference) continue;
    try {
      const transaction = await getMidtransStatus(reference);
      if (transaction.order_id !== reference || transaction.transaction_id !== order.payment_trx_id ||
          Math.round(Number(transaction.gross_amount)) !== Math.round(Number(order.total_idr))) {
        console.error("[expire-unpaid] Midtrans mismatch", order.order_no);
        continue;
      }
      if (await reconcileMidtransPayment(order, transaction)) continue;
      if (!["expire", "cancel", "deny"].includes(transaction.transaction_status)) continue;
      const { data: closed, error: closeError } = await db.from("storefront_orders")
        .update({ status: "CANCELLED", admin_note: `Midtrans ${transaction.transaction_status}: pembayaran tidak selesai` })
        .eq("id", order.id).eq("payment_trx_id", transaction.transaction_id)
        .is("paid_at", null).in("status", ["NEW", "AWAITING_PAYMENT"])
        .select("id").maybeSingle();
      if (closeError) throw closeError;
      if (!closed) continue;
      midtransExpired++;
      const { error: eventError } = await db.from("storefront_order_events").insert({
        order_id: order.id, from_status: order.status as "NEW" | "AWAITING_PAYMENT", to_status: "CANCELLED",
        note: `Transaksi Midtrans ${transaction.transaction_status}; pembayaran tidak diterima.`,
      });
      if (eventError) console.error("[expire-unpaid] timeline failed", order.order_no, eventError);
    } catch (error) {
      console.error("[expire-unpaid] check failed", order.order_no, error);
    }
  }
  const { data, error } = await db.rpc("ml_expire_unpaid_orders");
  if (error) throw new Error(error.message);
  const result = (data ?? {}) as { expired?: number; orders?: Array<{ order_no: string }> };
  const expired = Number(result.expired ?? 0) + midtransExpired;
  if (expired > 0) {
    await db.from("ops_job_runs").insert({
      job: "expire-unpaid",
      run_key: new Date().toISOString(),
      detail: result as never,
    });
  }
  return { expired, orders: result.orders ?? [] };
}

export async function lowStockAlert() {
  const db = await admin();
  const cfg = await settings(db);
  if (!cfg.lowStockEnabled) return { sent: false, reason: "disabled" as const };

  const { data, error } = await db
    .from("admin_inventory")
    .select("name, qty_on_hand_kg")
    .eq("is_published", true)
    .lte("qty_on_hand_kg", cfg.lowStockKg)
    .order("qty_on_hand_kg", { ascending: true })
    .limit(40);
  if (error) throw new Error(error.message);

  const items = data ?? [];
  if (items.length === 0) return { sent: false, reason: "nothing_low" as const };

  // One alert per Jakarta day, keyed on the affected item set so a new item
  // dropping below the line still triggers a fresh alert.
  const fingerprint = items.map((i) => `${i.name}:${Number(i.qty_on_hand_kg)}`).join("|");
  const runKey = `${jakartaToday()}#${fingerprint.length}:${items.length}`;
  if (!(await claim(db, "low-stock", runKey, { count: items.length }))) {
    return { sent: false, reason: "already_sent" as const };
  }

  await sendOpsAlert(
    {
      subject: `Stok menipis: ${items.length} item — Meatlink`,
      heading: "Stok menipis",
      intro: `${items.length} produk aktif berada pada atau di bawah ambang ${cfg.lowStockKg} kg.`,
      stats: [
        { label: "Item di bawah ambang", value: String(items.length) },
        { label: "Ambang batas", value: `${cfg.lowStockKg} kg` },
      ],
      listTitle: "Perlu restock",
      list: items.map((i) => ({ label: i.name as string, value: `${Number(i.qty_on_hand_kg)} kg` })),
      ctaUrl: `${SITE}/admin/inventory`,
      ctaLabel: "Buka inventory",
    },
    `low-stock-${runKey}`,
  );

  return { sent: true, count: items.length };
}

export async function dailyDigest(day?: string) {
  const db = await admin();
  const cfg = await settings(db);
  if (!cfg.digestEnabled) return { sent: false, reason: "disabled" as const };

  const target = day ?? jakartaYesterday();
  if (!(await claim(db, "daily-digest", target, {}))) {
    return { sent: false, reason: "already_sent" as const };
  }

  const { data, error } = await db.rpc("ml_ops_digest", { p_day: target });
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as {
    orders?: number;
    revenue_idr?: number;
    paid_orders?: number;
    awaiting_payment?: number;
    to_ship?: number;
    low_stock?: Array<{ name: string; qty_kg: number }>;
    low_stock_threshold_kg?: number;
  };

  await sendOpsAlert(
    {
      subject: `Ringkasan harian Meatlink — ${dayLabel(target)}`,
      heading: "Ringkasan harian",
      intro: `Aktivitas toko untuk ${dayLabel(target)}.`,
      stats: [
        { label: "Pesanan masuk", value: String(d.orders ?? 0) },
        { label: "Omzet (non-batal)", value: idr(Number(d.revenue_idr ?? 0)) },
        { label: "Pesanan terbayar", value: String(d.paid_orders ?? 0) },
        { label: "Menunggu pembayaran", value: String(d.awaiting_payment ?? 0) },
        { label: "Siap dikirim", value: String(d.to_ship ?? 0) },
      ],
      listTitle: `Stok menipis (≤ ${d.low_stock_threshold_kg ?? cfg.lowStockKg} kg)`,
      list: (d.low_stock ?? []).slice(0, 20).map((i) => ({
        label: i.name,
        value: `${Number(i.qty_kg)} kg`,
      })),
      ctaUrl: `${SITE}/admin`,
      ctaLabel: "Buka dashboard",
    },
    `daily-digest-${target}`,
  );

  return { sent: true, day: target };
}

/** Runs every scheduled job; safe to call repeatedly. */
export async function runOpsCron(jobs?: string[]) {
  const wanted = (name: string) => !jobs || jobs.length === 0 || jobs.includes(name);
  const out: Record<string, unknown> = {};
  if (wanted("expire-unpaid")) out["expire-unpaid"] = await expireUnpaidOrders();
  if (wanted("low-stock")) out["low-stock"] = await lowStockAlert();
  if (wanted("daily-digest")) out["daily-digest"] = await dailyDigest();
  return out;
}
