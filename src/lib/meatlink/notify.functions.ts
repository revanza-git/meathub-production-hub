import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PublicInput = { orderNo: string; token: string; event: "placed" | "completed" };
type AdminInput = { orderNo: string; event: "placed" | "paid" | "shipped" | "completed" };

/** Buyer-triggered notification; access proven by the tokenized tracking link. */
export const notifyOrderEventPublic = createServerFn({ method: "POST" })
  .inputValidator((input: PublicInput) => {
    const orderNo = String(input?.orderNo ?? "").trim();
    const token = String(input?.token ?? "").trim();
    const event = input?.event === "completed" ? "completed" : "placed";
    if (orderNo.length < 4 || token.length < 8) throw new Error("Tautan pesanan tidak valid.");
    return { orderNo, token, event } as const;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("storefront_orders")
      .select("id")
      .eq("order_no", data.orderNo)
      .eq("access_token", data.token)
      .maybeSingle();
    if (!order) return { sent: false, reason: "not_found" };
    const { sendOrderEmail } = await import("./notify.server");
    return sendOrderEmail(data.orderNo, data.event);
  });

/** Admin-triggered notification after a status or delivery change. */
export const notifyOrderEventAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AdminInput) => {
    const orderNo = String(input?.orderNo ?? "").trim();
    const allowed = ["placed", "paid", "shipped", "completed"] as const;
    const event = allowed.find((e) => e === input?.event);
    if (!orderNo || !event) throw new Error("Permintaan tidak valid.");
    return { orderNo, event };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("ml_has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { sendOrderEmail } = await import("./notify.server");
    return sendOrderEmail(data.orderNo, data.event);
  });
