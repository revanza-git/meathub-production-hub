import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------------- Queries ---------------- */

export const getFulfillmentByOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: f, error } = await context.supabase
      .from("fulfillments")
      .select("*")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!f) return null;
    const [receipts, jobs] = await Promise.all([
      context.supabase.from("hub_receipts").select("*").eq("fulfillment_id", f.id).order("received_at"),
      context.supabase.from("delivery_jobs").select("*").eq("fulfillment_id", f.id).order("created_at", { ascending: false }),
    ]);
    return {
      fulfillment: f,
      hub_receipts: receipts.data ?? [],
      delivery_jobs: jobs.data ?? [],
    };
  });

export const listVendorFulfillments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vendor_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Fulfillments where at least one item is from this vendor.
    const { data: items, error } = await context.supabase
      .from("order_items")
      .select("order_id")
      .eq("vendor_id", data.vendor_id);
    if (error) throw new Error(error.message);
    const orderIds = Array.from(new Set((items ?? []).map((i) => i.order_id)));
    if (!orderIds.length) return [];
    const { data: fs, error: fErr } = await context.supabase
      .from("fulfillments")
      .select("*, order:order_id(order_no, buyer_org_id)")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });
    if (fErr) throw new Error(fErr.message);
    return fs ?? [];
  });

export const listHubInbound = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fulfillments")
      .select("*, order:order_id(order_no, total_kg, notes)")
      .in("status", ["AWAITING_VENDOR_DISPATCH", "AWAITING_HUB_INBOUND", "HUB_RECEIVED", "READY_FOR_DISPATCH", "EXCEPTION"])
      .order("hub_deadline_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCourierDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("delivery_jobs")
      .select("*, fulfillment:fulfillment_id(order_id, buyer_org_id, delivery_address_id)")
      .eq("courier_user_id", context.userId)
      .order("scheduled_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getDeliveryTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: pts, error } = await context.supabase
      .from("delivery_tracking_points")
      .select("*")
      .eq("delivery_job_id", data.job_id)
      .order("recorded_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return pts ?? [];
  });

export const listPendingReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("return_requests")
      .select("*, order:order_id(order_no), qc_inspections(id, decision, notes, inspected_at)")
      .in("status", ["REQUESTED", "RECEIVED_AT_HUB", "QC_IN_REVIEW"])
      .order("requested_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("return_requests")
      .select("*, qc_inspections(decision, notes, inspected_at)")
      .eq("order_id", data.order_id)
      .order("requested_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ---------------- Mutations (RPC wrappers) ---------------- */

export const vendorDispatchToHub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ fulfillment_id: z.string().uuid(), notes: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("vendor_dispatch_to_hub", {
      _fulfillment_id: data.fulfillment_id,
      _notes: data.notes ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PackagingEnum = z.enum(["GOOD", "MINOR_DAMAGE", "MAJOR_DAMAGE", "TEMPERATURE_BREACH"]);

export const hubReceive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        fulfillment_id: z.string().uuid(),
        weight_kg: z.number().positive(),
        temperature_c: z.number().optional(),
        packaging: PackagingEnum,
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("hub_receive", {
      _fulfillment_id: data.fulfillment_id,
      _weight: data.weight_kg,
      _temperature: data.temperature_c ?? undefined,
      _packaging: data.packaging,
      _notes: data.notes ?? undefined,
      _evidence: [],
      _lot_expiry: null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const createDeliveryJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ fulfillment_id: z.string().uuid(), scheduled_date: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_delivery_job", {
      _fulfillment_id: data.fulfillment_id,
      _scheduled: data.scheduled_date,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const assignCourier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        courier_user_id: z.string().uuid(),
        vehicle_label: z.string().max(50).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("assign_courier", {
      _job_id: data.job_id,
      _courier: data.courier_user_id,
      _vehicle: data.vehicle_label ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const courierStartDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("courier_start_delivery", { _job_id: data.job_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const courierPostLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy_m: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("courier_post_location", {
      _job_id: data.job_id,
      _lat: data.latitude,
      _lng: data.longitude,
      _accuracy: data.accuracy_m ?? undefined,
      _speed: undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const courierCompleteDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        recipient_name: z.string().min(1).max(120),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("courier_complete_delivery", {
      _job_id: data.job_id,
      _proof: { recipient_name: data.recipient_name, notes: data.notes ?? null, at: new Date().toISOString() },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const requestReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        reason_code: z.enum(["WRONG_ITEM", "SPEC_MISMATCH", "DAMAGED", "TEMPERATURE_BREACH", "OTHER"]),
        description: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("request_return", {
      _order_id: data.order_id,
      _reason: data.reason_code,
      _description: data.description ?? undefined,
      _evidence: [],
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const qcDecide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        return_id: z.string().uuid(),
        decision: z.enum(["APPROVED", "REJECTED", "NEEDS_EVIDENCE"]),
        packaging: PackagingEnum.optional(),
        vendor_fault: z.boolean().optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("qc_decide", {
      _return_id: data.return_id,
      _decision: data.decision,
      _checklist: {},
      _packaging: data.packaging ?? undefined,
      _vendor_fault: data.vendor_fault ?? undefined,
      _notes: data.notes ?? undefined,
      _evidence: [],
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

/* ---------------- Courier directory (for dispatcher) ---------------- */

export const listCouriers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("organization_members")
      .select("user_id, profiles:user_id(display_name, email)")
      .eq("role", "courier")
      .eq("status", "ACTIVE");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: { user_id: string; profiles: { display_name: string; email: string } | null }) => ({
      user_id: r.user_id,
      display_name: r.profiles?.display_name ?? r.profiles?.email ?? r.user_id,
    }));
  });
