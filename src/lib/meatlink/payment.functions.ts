import { createServerFn } from "@tanstack/react-start";

type CreateInput = {
  orderNo: string;
  token: string;
  channel?: string;
};

export type PaymentInstruction = {
  channel: string;
  va: string | null;
  qrUrl: string | null;
  paymentUrl: string | null;
  expiresAt: string | null;
  total: number;
};

/**
 * Creates (or returns the existing) iPaymu VA / QRIS instruction for a storefront order.
 * Access is proven by the order's tokenized tracking link, so guests can pay without an account.
 */
export const createOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((input: CreateInput) => {
    const orderNo = String(input?.orderNo ?? "").trim();
    const token = String(input?.token ?? "").trim();
    if (orderNo.length < 4 || token.length < 8) throw new Error("Tautan pesanan tidak valid.");
    return { orderNo, token, channel: String(input?.channel ?? "").trim().slice(0, 20) };
  })
  .handler(async ({ data }): Promise<PaymentInstruction> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createDirectPayment, ipaymuChannel } = await import("./ipaymu.server");

    const { data: order, error } = await supabaseAdmin
      .from("storefront_orders")
      .select(
        "id, order_no, status, payment_method, payment_channel, payment_va, payment_qr_url, payment_url, payment_expires_at, total_idr, buyer_name, phone, email",
      )
      .eq("order_no", data.orderNo)
      .eq("access_token", data.token)
      .maybeSingle();

    if (error) throw new Error("Pesanan tidak dapat dibaca.");
    if (!order) throw new Error("Pesanan tidak ditemukan.");
    if (order.payment_method !== "BANK_TRANSFER" && order.payment_method !== "QRIS") {
      throw new Error("Metode pembayaran ini tidak memakai VA/QRIS.");
    }
    if (order.status !== "NEW" && order.status !== "AWAITING_PAYMENT") {
      throw new Error("Pesanan ini tidak menunggu pembayaran.");
    }

    const stillValid =
      (order.payment_va || order.payment_qr_url) &&
      (!order.payment_expires_at || new Date(order.payment_expires_at).getTime() > Date.now()) &&
      (!data.channel || data.channel === order.payment_channel);

    if (stillValid) {
      return {
        channel: order.payment_channel ?? "",
        va: order.payment_va,
        qrUrl: order.payment_qr_url,
        paymentUrl: order.payment_url,
        expiresAt: order.payment_expires_at,
        total: Number(order.total_idr),
      };
    }

    const { data: items } = await supabaseAdmin
      .from("storefront_order_items")
      .select("product_name, qty_kg, unit_price_idr")
      .eq("order_id", order.id);

    const picked = ipaymuChannel(order.payment_method as "BANK_TRANSFER" | "QRIS", data.channel);
    const siteUrl = process.env["SITE_URL"] ?? "https://meatlink.id";

    const result = await createDirectPayment({
      method: picked.method,
      channel: picked.channel,
      amount: Number(order.total_idr),
      referenceId: order.order_no,
      buyerName: order.buyer_name,
      phone: order.phone,
      email: order.email,
      notifyUrl: `${siteUrl.replace(/\/$/, "")}/api/public/ipaymu-callback`,
      products: (items ?? []).map((i) => ({
        name: i.product_name,
        qty: Number(i.qty_kg),
        price: Number(i.unit_price_idr),
      })),
    });

    const expired = result.Expired ? new Date(result.Expired.replace(" ", "T")) : null;
    const qrUrl = result.QrImage ?? result.QrTemplate ?? null;

    const patch = {
      payment_channel: picked.channel,
      payment_va: result.PaymentNo ?? null,
      payment_qr_url: qrUrl,
      payment_url: null as string | null,
      payment_expires_at: expired && !Number.isNaN(expired.getTime()) ? expired.toISOString() : null,
      payment_trx_id: result.TransactionId != null ? String(result.TransactionId) : null,
      status: "AWAITING_PAYMENT" as const,
    };

    await supabaseAdmin.from("storefront_orders").update(patch).eq("id", order.id);

    return {
      channel: picked.channel,
      va: patch.payment_va,
      qrUrl: patch.payment_qr_url,
      paymentUrl: patch.payment_url,
      expiresAt: patch.payment_expires_at,
      total: Number(order.total_idr),
    };
  });
