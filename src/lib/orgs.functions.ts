import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrgStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type OrgType = "BUYER" | "VENDOR" | "INTERNAL";

const CreateSchema = z.object({
  display_name: z.string().min(2).max(120),
  legal_name: z.string().min(2).max(200),
  type: z.enum(["BUYER", "VENDOR"]),
});

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("create_organization", {
      _display_name: data.display_name,
      _legal_name: data.legal_name,
      _type: data.type,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const submitOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ org_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("submit_organization", { _org_id: data.org_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ReviewSchema = z.object({
  org_id: z.string().uuid(),
  decision: z.enum(["START_REVIEW", "APPROVE", "REJECT"]),
  reason: z.string().max(500).optional(),
});

export const reviewOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("review_organization", {
      _org_id: data.org_id,
      _decision: data.decision,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type OrgSummary = {
  id: string;
  display_name: string;
  legal_name: string;
  type: OrgType;
  status: OrgStatus;
  created_at: string;
  approved_at: string | null;
  suspended_reason: string | null;
};

/** List orgs the current user is a member of (their onboarding view). */
export const listMyOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrgSummary[]> => {
    const { data, error } = await context.supabase
      .from("organization_members")
      .select(
        "organizations(id, display_name, legal_name, type, status, created_at, approved_at, suspended_reason)",
      )
      .eq("user_id", context.userId)
      .eq("status", "ACTIVE");
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((m) => m.organizations as OrgSummary | null)
      .filter((o): o is OrgSummary => !!o);
  });

/** Admin: list all orgs awaiting review / recently decided. */
export const listOrganizationsForReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ status: z.enum(["ALL", "PENDING", "APPROVED", "REJECTED"]).default("PENDING") })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<OrgSummary[]> => {
    const q = context.supabase
      .from("organizations")
      .select("id, display_name, legal_name, type, status, created_at, approved_at, suspended_reason")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status === "PENDING") q.in("status", ["SUBMITTED", "UNDER_REVIEW"]);
    else if (data.status === "APPROVED") q.eq("status", "APPROVED");
    else if (data.status === "REJECTED") q.eq("status", "REJECTED");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as OrgSummary[];
  });

export type OrgDetail = OrgSummary & {
  history: Array<{
    from_state: OrgStatus | null;
    to_state: OrgStatus;
    reason: string | null;
    created_at: string;
    actor_user_id: string | null;
  }>;
  documents: Array<{
    id: string;
    doc_type: string;
    file_name: string;
    storage_path: string;
    status: string;
    created_at: string;
  }>;
};

export const getOrganizationDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ org_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<OrgDetail> => {
    const [orgRes, histRes, docsRes] = await Promise.all([
      context.supabase
        .from("organizations")
        .select("id, display_name, legal_name, type, status, created_at, approved_at, suspended_reason")
        .eq("id", data.org_id)
        .maybeSingle(),
      context.supabase
        .from("org_state_history")
        .select("from_state, to_state, reason, created_at, actor_user_id")
        .eq("organization_id", data.org_id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("kyb_documents")
        .select("id, doc_type, file_name, storage_path, status, created_at")
        .eq("organization_id", data.org_id)
        .order("created_at", { ascending: false }),
    ]);
    if (orgRes.error) throw new Error(orgRes.error.message);
    if (!orgRes.data) throw new Error("Organization not found");
    if (histRes.error) throw new Error(histRes.error.message);
    if (docsRes.error) throw new Error(docsRes.error.message);
    return {
      ...(orgRes.data as OrgSummary),
      history: (histRes.data ?? []) as OrgDetail["history"],
      documents: (docsRes.data ?? []) as OrgDetail["documents"],
    };
  });

/** Generate a signed URL to view a KYB document (10 min). */
export const signKybDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ storage_path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("kyb")
      .createSignedUrl(data.storage_path, 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
