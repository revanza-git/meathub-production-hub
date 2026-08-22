import { createFileRoute } from "@tanstack/react-router";

/**
 * iPaymu payment notification endpoint.
 * The callback body is untrusted: every notification is re-verified against the
 * iPaymu transaction API before an order is marked as paid.
 */
export const Route = createFileRoute("/api/public/ipaymu-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: Record<string, string> = {};
        try {
          const raw = await request.text();
          const type = request.headers.get("content-type") ?? "";
          if (type.includes("application/json")) {
            payload = JSON.parse(raw) as Record<string, string>;
          } else {
            payload = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;
          }
        } catch {
          return new Response("bad request", { status: 400 });
        }

        const trxId = String(payload["trx_id"] ?? payload["transaction_id"] ?? "").trim();
        const referenceId = String(payload["reference_id"] ?? payload["referenceId"] ?? "").trim();
        if (!trxId) return new Response("missing trx_id", { status: 400 });

        const { fetchTransaction } = await import("@/lib/meatlink/ipaymu.server");
        let verifiedPaid = false;
        let verifiedAmount = 0;
        try {
          const trx = await fetchTransaction(trxId);
          const desc = String(trx.StatusDesc ?? "").toLowerCase();
          verifiedPaid = trx.Status === 1 || desc === "berhasil" || desc === "success";
          verifiedAmount = Number(trx.Amount ?? 0);
        } catch {
          return new Response("verification failed", { status: 502 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const query = supabaseAdmin
          .from("storefront_orders")
          .select("id, order_no, status, total_idr, paid_at");
        const { data: order } = referenceId
          ? await query.eq("order_no", referenceId).maybeSingle()
          : await query.eq("payment_trx_id", trxId).maybeSingle();

        if (!order) return new Response("order not found", { status: 404 });
        if (!verifiedPaid) return new Response("ok");
        if (order.paid_at) return new Response("ok");
        if (verifiedAmount > 0 && Math.round(verifiedAmount) < Math.round(Number(order.total_idr))) {
          return new Response("ok");
        }

        await supabaseAdmin
          .from("storefront_orders")
          .update({
            status: "PAID",
            paid_at: new Date().toISOString(),
            payment_trx_id: trxId,
            payment_ref: `iPaymu ${trxId}`,
          })
          .eq("id", order.id);

        await supabaseAdmin.from("storefront_order_events").insert({
          order_id: order.id,
          from_status: order.status,
          to_status: "PAID",
          note: `Pembayaran iPaymu terverifikasi (trx ${trxId})`,
        });

        try {
          const { sendOrderEmail } = await import("@/lib/meatlink/notify.server");
          await sendOrderEmail(order.order_no, "paid");
        } catch (err) {
          console.error("[notify] paid email failed", err);
        }

        return new Response("ok");
      },
    },
  },
});
