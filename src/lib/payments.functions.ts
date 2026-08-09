import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createSchema = z.object({
  orderRef: z.string().min(3).max(64),
  channelId: z.string().min(2).max(32),
  amount: z.number().int().min(1000).max(2_000_000_000),
  customer: z.object({
    name: z.string().min(1).max(120),
    phone: z.string().min(6).max(20),
    email: z.string().email().max(160),
  }),
});

export type CreatedPayment = {
  intentId: string;
  status: string;
  channelId: string;
  paymentNo: string | null;
  paymentName: string | null;
  qrString: string | null;
  amount: number;
  fee: number;
  expiresAt: string | null;
  reference: string | null;
};

export const createOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data }): Promise<CreatedPayment> => {
    const { channelById } = await import("@/lib/market/channels");
    const { directPayment } = await import("@/lib/ipaymu.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const channel = channelById(data.channelId);
    if (!channel) throw new Error("Kanal pembayaran tidak dikenal.");

    const siteUrl = process.env["SITE_URL"] ?? "https://meathub-production-hub.lovable.app";
    const notifyUrl = `${siteUrl.replace(/\/$/, "")}/api/public/ipaymu/callback`;
    const referenceId = `${data.orderRef}-${Date.now().toString().slice(-6)}`;

    const res = await directPayment({
      name: data.customer.name,
      phone: data.customer.phone,
      email: data.customer.email,
      amount: data.amount,
      referenceId,
      paymentMethod: channel.method,
      paymentChannel: channel.channel,
      notifyUrl,
      expiredMinutes: 60,
      comments: `MEATHUB ${data.orderRef}`,
    });

    if (res.Status !== 200 || !res.Data) {
      const msg = Array.isArray(res.Message) ? res.Message.join(", ") : res.Message;
      throw new Error(msg || "Gagal membuat pembayaran di iPaymu.");
    }

    const d = res.Data;
    const expiresAt = d.Expired ? new Date(d.Expired.replace(" ", "T") + "+07:00").toISOString() : null;

    const { data: row, error } = await supabaseAdmin
      .from("payment_intents")
      .insert({
        order_ref: data.orderRef,
        provider: "ipaymu",
        channel: data.channelId,
        channel_code: channel.channel,
        amount: data.amount,
        fee: Number(d.Fee ?? 0),
        reference: String(d.TransactionId ?? referenceId),
        payment_no: d.PaymentNo ?? null,
        payment_name: d.PaymentName ?? channel.label,
        qr_string: d.QrString ?? null,
        status: "PENDING",
        expires_at: expiresAt,
        request_payload: { referenceId, channel: data.channelId, amount: data.amount },
        response_payload: res as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return {
      intentId: row.id,
      status: "PENDING",
      channelId: data.channelId,
      paymentNo: d.PaymentNo ?? null,
      paymentName: d.PaymentName ?? channel.label,
      qrString: d.QrString ?? null,
      amount: data.amount,
      fee: Number(d.Fee ?? 0),
      expiresAt,
      reference: String(d.TransactionId ?? referenceId),
    };
  });

export const getPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ intentId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { checkTransaction, mapIpaymuStatus } = await import("@/lib/ipaymu.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: intent, error } = await supabaseAdmin
      .from("payment_intents")
      .select("id, status, reference, expires_at")
      .eq("id", data.intentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!intent) throw new Error("Pembayaran tidak ditemukan.");

    if (intent.status === "PAID" || intent.status === "EXPIRED" || intent.status === "FAILED") {
      return { status: intent.status as string };
    }

    if (!intent.reference) return { status: intent.status as string };

    const res = await checkTransaction(intent.reference);
    const mapped = mapIpaymuStatus(res.Data?.Status);

    if (mapped !== intent.status) {
      await supabaseAdmin
        .from("payment_intents")
        .update({
          status: mapped,
          paid_at: mapped === "PAID" ? new Date().toISOString() : null,
          response_payload: res as unknown as Record<string, unknown>,
        })
        .eq("id", intent.id);
    }

    return { status: mapped };
  });
