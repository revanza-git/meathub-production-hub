import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProductTier = "COMMODITY_PREMIUM" | "SUPER_PREMIUM" | "UNDERVALUED_QC" | "SBMEAT_HOUSE";
export type CatalogStatus = "DRAFT" | "REVIEW" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type EvidenceType = "AWARD" | "ASSOCIATION" | "QC" | "DISCLOSURE";
export type EvidenceStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MasterRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
};

/** ---------- MASTERS ---------- */

export const listMasters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [sp, cu, br, gr] = await Promise.all([
      context.supabase.from("species").select("id, code, name, description, is_active").order("name"),
      context.supabase
        .from("cuts")
        .select("id, code, name, description, is_active, species_id")
        .order("name"),
      context.supabase.from("brands").select("id, code, name, description, is_active, country_origin").order("name"),
      context.supabase.from("grades").select("id, code, name, description, is_active, system, rank").order("rank", { ascending: false }),
    ]);
    for (const r of [sp, cu, br, gr]) if (r.error) throw new Error(r.error.message);
    return {
      species: (sp.data ?? []) as MasterRow[],
      cuts: (cu.data ?? []) as (MasterRow & { species_id: string })[],
      brands: (br.data ?? []) as (MasterRow & { country_origin: string | null })[],
      grades: (gr.data ?? []) as (MasterRow & { system: string | null; rank: number | null })[],
    };
  });

const UpsertMaster = z.object({
  entity: z.enum(["species", "brands", "grades"]),
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});
export const upsertMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertMaster.parse(d))
  .handler(async ({ data, context }) => {
    const payload: Record<string, unknown> = {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      is_active: data.is_active ?? true,
    };
    if (data.id) payload.id = data.id;
    const { error } = await context.supabase.from(data.entity).upsert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpsertCut = z.object({
  id: z.string().uuid().optional(),
  species_id: z.string().uuid(),
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});
export const upsertCut = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertCut.parse(d))
  .handler(async ({ data, context }) => {
    const payload: Record<string, unknown> = { ...data, is_active: data.is_active ?? true };
    const { error } = await context.supabase.from("cuts").upsert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** ---------- PRODUCTS ---------- */

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  tier: ProductTier;
  status: CatalogStatus;
  species_id: string;
  cut_id: string;
  brand_id: string;
  grade_id: string;
  description: string | null;
  primary_image_url: string | null;
  undervalued_disclosure: string | null;
  disclosure_version: string | null;
  created_at: string;
  species?: { name: string } | null;
  cut?: { name: string } | null;
  brand?: { name: string } | null;
  grade?: { name: string } | null;
};

const PRODUCT_COLS =
  "id, sku, name, tier, status, species_id, cut_id, brand_id, grade_id, description, primary_image_url, undervalued_disclosure, disclosure_version, created_at, species:species_id(name), cut:cut_id(name), brand:brand_id(name), grade:grade_id(name)";

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.enum(["ALL", "DRAFT", "REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"]).default("ALL"),
        q: z.string().max(120).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("products").select(PRODUCT_COLS).order("created_at", { ascending: false }).limit(200);
    if (data.status !== "ALL") q = q.eq("status", data.status);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ProductRow[];
  });

const UpsertProduct = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(2).max(64),
  name: z.string().min(2).max(200),
  species_id: z.string().uuid(),
  cut_id: z.string().uuid(),
  brand_id: z.string().uuid(),
  grade_id: z.string().uuid(),
  tier: z.enum(["COMMODITY_PREMIUM", "SUPER_PREMIUM", "UNDERVALUED_QC", "SBMEAT_HOUSE"]),
  description: z.string().max(2000).optional(),
  primary_image_url: z.string().url().optional().or(z.literal("")),
  undervalued_disclosure: z.string().max(2000).optional(),
  disclosure_version: z.string().max(20).optional(),
});
export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertProduct.parse(d))
  .handler(async ({ data, context }) => {
    const payload: Record<string, unknown> = { ...data };
    if (payload.primary_image_url === "") payload.primary_image_url = null;
    const { data: row, error } = await context.supabase.from("products").upsert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

const TransitionProduct = z.object({
  id: z.string().uuid(),
  to: z.enum(["DRAFT", "REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"]),
});
export const transitionProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TransitionProduct.parse(d))
  .handler(async ({ data, context }) => {
    // Gate: SUPER_PREMIUM cannot go ACTIVE without ≥1 approved evidence.
    if (data.to === "ACTIVE") {
      const { data: prod, error: pe } = await context.supabase
        .from("products")
        .select("tier")
        .eq("id", data.id)
        .maybeSingle();
      if (pe) throw new Error(pe.message);
      if (!prod) throw new Error("Product not found");
      if (prod.tier === "SUPER_PREMIUM") {
        const { count } = await context.supabase
          .from("product_evidence")
          .select("id", { count: "exact", head: true })
          .eq("product_id", data.id)
          .eq("status", "APPROVED");
        if ((count ?? 0) < 1)
          throw new Error("Super Premium requires at least one APPROVED evidence before activation");
      }
      if (prod.tier === "UNDERVALUED_QC") {
        const { data: p2 } = await context.supabase
          .from("products")
          .select("undervalued_disclosure, disclosure_version")
          .eq("id", data.id)
          .maybeSingle();
        if (!p2?.undervalued_disclosure || !p2?.disclosure_version)
          throw new Error("Undervalued products require a disclosure text + version before activation");
      }
    }
    const { error } = await context.supabase
      .from("products")
      .update({ status: data.to })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** ---------- EVIDENCE ---------- */

export const listEvidence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ product_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("product_evidence")
      .select("id, type, title, source_url, object_key, status, notes, created_at")
      .eq("product_id", data.product_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const UpsertEvidence = z.object({
  product_id: z.string().uuid(),
  type: z.enum(["AWARD", "ASSOCIATION", "QC", "DISCLOSURE"]),
  title: z.string().max(200).optional(),
  source_url: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});
export const addEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertEvidence.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("product_evidence").insert({ ...data, status: "PENDING" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decideEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["APPROVED", "REJECTED"]),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("product_evidence")
      .update({
        status: data.decision,
        notes: data.notes ?? null,
        verified_by: context.userId,
        verified_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** ---------- BUYER SEARCH ---------- */

export type SearchOfferHit = {
  offer_id: string;
  product_id: string;
  sku: string;
  name: string;
  tier: ProductTier;
  brand: string | null;
  grade: string | null;
  species: string | null;
  cut: string | null;
  vendor_id: string;
  vendor_name: string;
  purchase_type: "LOAF" | "CARTON" | "RETAIL";
  base_price_per_kg: number;
  min_qty: number;
  qty_step: number;
  primary_image_url: string | null;
  stock: { available_kg: number; on_hand_kg: number; as_of: string } | null;
};

export const searchOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        q: z.string().max(120).optional(),
        purchase_type: z.enum(["LOAF", "CARTON", "RETAIL"]).optional(),
        tier: z.enum(["COMMODITY_PREMIUM", "SUPER_PREMIUM", "UNDERVALUED_QC", "SBMEAT_HOUSE"]).optional(),
        service_zone: z.enum(["JKT_INNER", "JKT_OUTER", "BODETABEK"]).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<SearchOfferHit[]> => {
    let q = context.supabase
      .from("vendor_offers")
      .select(
        `id, vendor_id, product_id, purchase_type, base_price_per_kg, min_qty, qty_step, service_zones,
         product:product_id(sku, name, tier, primary_image_url, status,
           species:species_id(name), cut:cut_id(name), brand:brand_id(name), grade:grade_id(name)),
         vendor:vendor_id(display_name)`,
      )
      .eq("status", "ACTIVE")
      .limit(100);
    if (data.purchase_type) q = q.eq("purchase_type", data.purchase_type);
    if (data.service_zone) q = q.contains("service_zones", [data.service_zone]);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    type Raw = {
      id: string; vendor_id: string; product_id: string;
      purchase_type: "LOAF" | "CARTON" | "RETAIL";
      base_price_per_kg: number; min_qty: number; qty_step: number;
      product: { sku: string; name: string; tier: ProductTier; primary_image_url: string | null; status: CatalogStatus;
        species: { name: string } | null; cut: { name: string } | null; brand: { name: string } | null; grade: { name: string } | null } | null;
      vendor: { display_name: string } | null;
    };
    const raw = (rows ?? []) as unknown as Raw[];
    const filtered = raw.filter((r) => {
      if (!r.product || r.product.status !== "ACTIVE") return false;
      if (data.tier && r.product.tier !== data.tier) return false;
      if (data.q && !r.product.name.toLowerCase().includes(data.q.toLowerCase())) return false;
      return true;
    });

    // Latest inventory per offer
    const offerIds = filtered.map((r) => r.id);
    let invByOffer = new Map<string, { available_kg: number; on_hand_kg: number; as_of: string }>();
    if (offerIds.length > 0) {
      const { data: inv } = await context.supabase
        .from("inventory_snapshots")
        .select("offer_id, available_kg, on_hand_kg, as_of")
        .in("offer_id", offerIds)
        .order("as_of", { ascending: false });
      for (const s of inv ?? []) {
        if (!invByOffer.has(s.offer_id)) invByOffer.set(s.offer_id, s);
      }
    }

    const hits: SearchOfferHit[] = filtered.map((r) => ({
      offer_id: r.id,
      product_id: r.product_id,
      sku: r.product!.sku,
      name: r.product!.name,
      tier: r.product!.tier,
      brand: r.product!.brand?.name ?? null,
      grade: r.product!.grade?.name ?? null,
      species: r.product!.species?.name ?? null,
      cut: r.product!.cut?.name ?? null,
      vendor_id: r.vendor_id,
      vendor_name: r.vendor?.display_name ?? "Vendor",
      purchase_type: r.purchase_type,
      base_price_per_kg: Number(r.base_price_per_kg),
      min_qty: Number(r.min_qty),
      qty_step: Number(r.qty_step),
      primary_image_url: r.product!.primary_image_url,
      stock: invByOffer.get(r.id) ?? null,
    }));

    hits.sort((a, b) => a.base_price_per_kg - b.base_price_per_kg);
    return hits;
  });

export const getProductDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ product_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [pRes, offersRes, evRes] = await Promise.all([
      context.supabase.from("products").select(PRODUCT_COLS).eq("id", data.product_id).maybeSingle(),
      context.supabase
        .from("vendor_offers")
        .select("id, vendor_id, purchase_type, base_price_per_kg, min_qty, qty_step, status, vendor:vendor_id(display_name)")
        .eq("product_id", data.product_id)
        .eq("status", "ACTIVE"),
      context.supabase
        .from("product_evidence")
        .select("id, type, title, source_url, status")
        .eq("product_id", data.product_id)
        .eq("status", "APPROVED"),
    ]);
    if (pRes.error) throw new Error(pRes.error.message);
    if (!pRes.data) throw new Error("Product not found");
    if (offersRes.error) throw new Error(offersRes.error.message);
    if (evRes.error) throw new Error(evRes.error.message);
    return { product: pRes.data as unknown as ProductRow, offers: offersRes.data ?? [], evidence: evRes.data ?? [] };
  });
