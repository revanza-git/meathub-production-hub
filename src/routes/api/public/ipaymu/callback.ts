import { createFileRoute } from "@tanstack/react-router";

/**
 * iPaymu notify URL. iPaymu posts form-encoded (or JSON) data here.
 * We never trust the payload: the transaction is re-verified against the
 * iPaymu API before an intent is marked PAID. Idempotent by transaction id.
 */
export const Route = createFileRoute("/api/public/ipaymu/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkTransaction, mapIpaymuStatus } = await import("@/lib/ipaymu.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const contentType = request.headers.get("content-type") ?? "";
        let payload: Record<string, unknown> = {};
        try {
          if (contentType.includes("application/json")) {
            payload = (await request.json()) as Record<string, unknown>;
          } else {
            payload = Object.fromEntries((await request.formData()).entries()) as Record<string, unknown>;
          }
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const trxId = String(payload["trx_id"] ?? payload["transaction_id"] ?? payload["TransactionId"] ?? "");
        if (!trxId) {
          await supabaseAdmin.from("payment_events").insert({
            provider: "ipaymu",
            event_type: "callback",
            payload: JSON.parse(JSON.stringify(payload)),
            verified: false,
          });
          return new Response("Missing transaction id", { status: 400 });
        }

        const { data: intent } = await supabaseAdmin
          .from("payment_intents")
          .select("id, status, order_ref")
          .eq("provider", "ipaymu")
          .eq("reference", trxId)
          .maybeSingle();

        // Verify with iPaymu instead of trusting the callback body.
        let verifiedStatus: string | null = null;
        try {
          const res = await checkTransaction(trxId);
          verifiedStatus = mapIpaymuStatus(res.Data?.Status);
        } catch {
          verifiedStatus = null;
        }

        await supabaseAdmin.from("payment_events").insert({
          payment_intent_id: intent?.id ?? null,
          provider: "ipaymu",
          reference: trxId,
          event_type: "callback",
          status: verifiedStatus,
          payload: JSON.parse(JSON.stringify(payload)),
          verified: verifiedStatus !== null,
        });

        if (!intent || !verifiedStatus) return new Response("ok");
        if (intent.status === verifiedStatus) return new Response("ok");

        await supabaseAdmin
          .from("payment_intents")
          .update({
            status: verifiedStatus as never,
            paid_at: verifiedStatus === "PAID" ? new Date().toISOString() : null,
          })
          .eq("id", intent.id);

        return new Response("ok");
      },
      GET: async () => new Response("ok"),
    },
  },
});
