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
        const { validMidtransSignature, getMidtransStatus, paymentReference } = await import("@/lib/meatlink/midtrans.server");
        const environment = (["production", "sandbox"] as const).find((env) => {
          try { return validMidtransSignature(payload, env); } catch { return false; }
        });
        if (!environment) return new Response("invalid signature", { status: 401 });
        try {
          const verified = await getMidtransStatus(payload.order_id, environment);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: order, error } = await supabaseAdmin.from("storefront_orders")
            .select("id, order_no, status, total_idr, paid_at, payment_trx_id, payment_ref")
            .eq("payment_ref", paymentReference(environment, payload.order_id)).maybeSingle();
          if (error) throw error;
          if (!order) return new Response("order not ready", { status: 503 });
          const { reconcileMidtransPayment, reconcileMidtransClosure } = await import("@/lib/meatlink/payment-status.server");
          const paid = await reconcileMidtransPayment(order, verified);
          if (!paid) await reconcileMidtransClosure(order, verified);
           try {
             const { checkReconciliation } = await import("@/lib/meatlink/reconciliation.server");
             // Snapshot is supplementary; never retry a completed status update because the report failed.
             await checkReconciliation(supabaseAdmin, order);
           } catch (snapshotError) { console.error("[midtrans] reconciliation snapshot failed", snapshotError); }
          return new Response("ok");
        } catch (err) {
          console.error("[midtrans] callback failed", err);
          return new Response("verification failed", { status: 503 });
        }
      },
    },
  },
});