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
    const { createMidtransCharge } = await import("./midtrans.server");

    const { data: order, error } = await supabaseAdmin
      .from("storefront_orders")
      .select(
        "id, order_no, status, payment_method, payment_channel, payment_va, payment_qr_url, payment_url, payment_expires_at, payment_trx_id, payment_ref, total_idr, buyer_name, phone, email",
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
      order.payment_ref?.startsWith("Midtrans ") && (order.payment_va || order.payment_qr_url) &&
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

    const method = order.payment_method as "BANK_TRANSFER" | "QRIS";
    const bank = method === "QRIS" ? "qris" : data.channel || "bca";
    if (method === "BANK_TRANSFER" && !["bca", "bni", "bri", "permata", "mandiri"].includes(bank)) {
      throw new Error("Bank tidak didukung oleh Midtrans.");
    }
    // A fresh Midtrans ID allows retry after expiration without colliding with an older attempt.
    const orderId = `${order.order_no}-${crypto.randomUUID().slice(0, 8)}`;
    const result = await createMidtransCharge({
      orderId,
      amount: Number(order.total_idr),
      method,
      bank,
      name: order.buyer_name,
      phone: order.phone,
      email: order.email,
    });
    const qrUrl = result.actions?.find((action) => action.name === "generate-qr-code")?.url ?? null;
    const va = result.va_numbers?.[0]?.va_number ?? result.permata_va_number ??
      (result.bill_key && result.biller_code ? `${result.biller_code} / ${result.bill_key}` : null);
    if (method === "QRIS" && !qrUrl || method === "BANK_TRANSFER" && !va) {
      throw new Error("Midtrans belum mengembalikan instruksi pembayaran. Hubungi tim kami.");
    }

    const patch = {
      payment_channel: bank,
      payment_va: va,
      payment_qr_url: qrUrl,
      payment_url: null as string | null,
      payment_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      payment_trx_id: result.transaction_id,
      payment_ref: `Midtrans ${orderId}`,
      status: "AWAITING_PAYMENT" as const,
    };
    const { error: saveError } = await supabaseAdmin.from("storefront_orders").update(patch)
      .eq("id", order.id).in("status", ["NEW", "AWAITING_PAYMENT"]);
    if (saveError) throw new Error("Gagal menyimpan instruksi pembayaran.");

    return {
      channel: bank,
      va: patch.payment_va,
      qrUrl: patch.payment_qr_url,
      paymentUrl: patch.payment_url,
      expiresAt: patch.payment_expires_at,
      total: Number(order.total_idr),
    };
  });
