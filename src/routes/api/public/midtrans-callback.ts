import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const notificationSchema = z.object({
  order_id: z.string().min(4).max(120),
  transaction_id: z.string().min(4).max(120),
  signature_key: z.string().length(128),
  gross_amount: z.string().max(30),
  status_code: z.string().max(5),
}).passthrough();

export const Route = createFileRoute("/api/public/midtrans-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (Number(request.headers.get("content-length")) > 16000) return new Response("too large", { status: 413 });
        let payload: z.infer<typeof notificationSchema>;
        try {
          payload = notificationSchema.parse(JSON.parse(await request.text()));
        } catch {
          return new Response("bad request", { status: 400 });
        }
        const { validMidtransSignature, getMidtransStatus } = await import("@/lib/meatlink/midtrans.server");
        if (!validMidtransSignature(payload)) return new Response("invalid signature", { status: 401 });
        try {
          const verified = await getMidtransStatus(payload.order_id);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: order, error } = await supabaseAdmin.from("storefront_orders")
            .select("id, order_no, status, total_idr, paid_at, payment_trx_id, payment_ref")
            .eq("payment_ref", `Midtrans ${payload.order_id}`).maybeSingle();
          if (error) throw error;
          if (!order) return new Response("order not ready", { status: 503 });
          const { reconcileMidtransPayment } = await import("@/lib/meatlink/payment-status.server");
          await reconcileMidtransPayment(order, verified);
          return new Response("ok");
        } catch (err) {
          console.error("[midtrans] callback failed", err);
          return new Response("verification failed", { status: 503 });
        }
      },
    },
  },
});