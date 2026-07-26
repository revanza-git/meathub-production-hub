import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const processReturnRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      return_id: z.string().uuid(),
      amount: z.number().positive(),
      method: z.enum(["BANK_TRANSFER", "VIRTUAL_ACCOUNT", "CASH", "OTHER"]),
      reference: z.string().optional(),
      notes: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: refundId, error } = await context.supabase.rpc("process_return_refund", {
      _return_id: data.return_id,
      _amount: data.amount,
      _method: data.method as never,
      _reference: data.reference,
      _notes: data.notes,
    });
    if (error) throw new Error(error.message);
    return { refund_id: refundId };
  });

export const closeReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ return_id: z.string().uuid(), resolution: z.string().min(3) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("close_return", {
      _return_id: data.return_id,
      _resolution: data.resolution,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReturnsForFinance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("return_requests")
      .select("id, return_number, order_id, buyer_org_id, status, reason_code, description, resolution, resolved_at, requested_at, orders(order_no, total_amount)")
      .in("status", ["APPROVED", "REFUNDED", "CLOSED"])
      .order("requested_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listRefundsForOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("refunds")
      .select("id, amount, method, reference, notes, created_at, return_request_id")
      .eq("order_id", data.order_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
