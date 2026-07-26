import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const severity = z.enum(["SP1","SP2","SP3","SP4","SP5"]);
const category = z.enum(["ORDER_REJECTION","LATE_DISPATCH","QC_FAIL","RETURN_VENDOR_FAULT","DOCUMENT_MISSING","POLICY_VIOLATION","OTHER"]);

export const listSpWarnings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ vendor_id: z.string().uuid().optional(), only_active: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("sp_warnings")
      .select("*, vendor:vendor_id(display_name), order:related_order_id(order_no)")
      .order("issued_at", { ascending: false })
      .limit(300);
    if (data.vendor_id) q = q.eq("vendor_id", data.vendor_id);
    if (data.only_active) q = q.is("resolved_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listVendorReliability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vendor_reliability")
      .select("*")
      .order("reliability_score", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listVendorOrgs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("organizations")
      .select("id, display_name, status")
      .eq("type", "VENDOR")
      .order("display_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const issueSpWarning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    vendor_id: z.string().uuid(),
    severity,
    category,
    reason: z.string().min(3),
    related_order_id: z.string().uuid().optional(),
    expires_at: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("issue_sp_warning", {
      _vendor_id: data.vendor_id,
      _severity: data.severity,
      _category: data.category,
      _reason: data.reason,
      _related_order_id: data.related_order_id ?? undefined,
      _expires_at: data.expires_at ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const resolveSpWarning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), notes: z.string().min(3) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("resolve_sp_warning", { _id: data.id, _notes: data.notes });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Feature flags
export const listFeatureFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("feature_flags").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ key: z.string().min(2), enabled: z.boolean(), description: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_feature_flag", {
      _key: data.key, _enabled: data.enabled, _description: data.description ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Audit log
export const listAuditEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    entity_type: z.string().optional(),
    action: z.string().optional(),
    organization_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(500).optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("audit_events").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 200);
    if (data.entity_type) q = q.eq("entity_type", data.entity_type);
    if (data.action) q = q.eq("action", data.action);
    if (data.organization_id) q = q.eq("organization_id", data.organization_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      ...r,
      ip_address: r.ip_address ? String(r.ip_address) : null,
    })) as Array<Omit<NonNullable<typeof rows>[number], "ip_address"> & { ip_address: string | null }>;
  });
