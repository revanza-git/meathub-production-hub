import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ buyer_org_id: z.string().uuid().optional(), status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("invoices").select("*, order:order_id(order_no), buyer:buyer_org_id(display_name)").order("issued_at", { ascending: false }).limit(200);
    if (data.buyer_org_id) q = q.eq("buyer_org_id", data.buyer_org_id);
    if (data.status) q = q.eq("status", data.status as "ISSUED"|"PARTIALLY_PAID"|"PAID"|"OVERDUE"|"VOID");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getInvoiceByOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: inv, error } = await context.supabase
      .from("invoices")
      .select("*, payments(id, amount, method, reference, received_at)")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return inv;
  });

export const issueInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.rpc("issue_invoice", { _order_id: data.order_id });
    if (error) throw new Error(error.message);
    return { invoice_id: r as unknown as string };
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    invoice_id: z.string().uuid(),
    amount: z.number().positive(),
    method: z.enum(["BANK_TRANSFER","VA","CASH","OTHER"]),
    reference: z.string().optional(),
    notes: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("record_payment", {
      _invoice_id: data.invoice_id,
      _amount: data.amount,
      _method: data.method,
      _reference: data.reference ?? undefined,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSettlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vendor_id: z.string().uuid().optional(), status: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("settlements").select("*, vendor:vendor_id(display_name)").order("created_at", { ascending: false }).limit(200);
    if (data.vendor_id) q = q.eq("vendor_id", data.vendor_id);
    if (data.status) q = q.eq("status", data.status as "DRAFT"|"APPROVED"|"PAID"|"CANCELLED");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getSettlementDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [s, items] = await Promise.all([
      context.supabase.from("settlements").select("*, vendor:vendor_id(display_name)").eq("id", data.id).single(),
      context.supabase.from("settlement_items").select("*, order:order_id(order_no)").eq("settlement_id", data.id),
    ]);
    if (s.error) throw new Error(s.error.message);
    if (items.error) throw new Error(items.error.message);
    return { settlement: s.data, items: items.data ?? [] };
  });

export const generateSettlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ period_end: z.string().optional(), commission_rate: z.number().min(0).max(1).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.rpc("generate_settlements", {
      _period_end: data.period_end ?? undefined,
      _commission_rate: data.commission_rate ?? 0.05,
    });
    if (error) throw new Error(error.message);
    return { created: (r as unknown as number) ?? 0 };
  });

export const approveSettlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("approve_settlement", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markSettlementPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), reference: z.string().min(3) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("mark_settlement_paid", { _id: data.id, _reference: data.reference });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDeliveredOrdersForInvoicing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, order_no, buyer_org_id, total_amount, updated_at, buyer:buyer_org_id(display_name), invoice:invoices(id)")
      .in("status", ["DELIVERED", "CLOSED"])
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).filter((o) => !(o.invoice as { id: string }[] | null)?.length);
  });
