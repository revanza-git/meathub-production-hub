import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";
import { rfqSchema } from "./leads";

const trackingSchema = z.object({
  referenceNo: z
    .string()
    .trim()
    .regex(/^RFQ-[A-Z0-9]{8,16}$/),
  token: z.string().trim().min(32).max(128),
});

const responseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "in_review", "quoted", "won", "lost"]),
  response: z.string().trim().min(1).max(4000),
  validUntil: z.string().date().nullable(),
  sendEmail: z.boolean(),
});

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createReference() {
  return `RFQ-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

async function optionalUserId() {
  const authorization = getRequestHeader("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const client = createClient<Database>(url, key, { auth: { persistSession: false } });
  const { data } = await client.auth.getUser(authorization.slice(7));
  return data.user?.id ?? null;
}

export const submitRfqRequest = createServerFn({ method: "POST" })
  .inputValidator((input) => rfqSchema.parse(input))
  .handler(async ({ data }) => {
    const token = randomToken();
    const referenceNo = createReference();
    const first = data.items[0];
    if (!first) throw new Error("Minimal satu produk diperlukan.");
    const userId = await optionalUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("quote_requests").insert({
      company_name: data.company_name,
      contact_name: data.contact_name,
      whatsapp: data.whatsapp,
      email: data.email || null,
      delivery_location: data.delivery_location,
      items: data.items as unknown as Json,
      category: first.category || null,
      product_cut: first.product_cut,
      origin_preference: first.origin_preference || null,
      brand_preference: first.brand_preference || null,
      grade: first.grade || null,
      volume: first.volume,
      purchase_frequency: data.purchase_frequency || null,
      current_supplier: data.current_supplier || null,
      current_price: data.current_price || null,
      target_price: data.target_price || null,
      payment_terms: data.payment_terms || null,
      required_delivery_date: data.required_delivery_date,
      notes: data.notes || null,
      user_id: userId,
      reference_no: referenceNo,
      access_token_hash: await sha256(token),
    });
    if (error) throw new Error("Permintaan belum dapat disimpan. Silakan coba lagi.");
    return { referenceNo, token, status: "new" as const };
  });

export const getTrackedRfq = createServerFn({ method: "GET" })
  .inputValidator((input) => trackingSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("quote_requests")
      .select(
        "reference_no, company_name, delivery_location, required_delivery_date, status, created_at, updated_at, items, admin_response, responded_at, response_valid_until",
      )
      .eq("reference_no", data.referenceNo)
      .or(
        `access_token_hash.eq.${await sha256(data.token)},email_access_token_hash.eq.${await sha256(data.token)}`,
      )
      .maybeSingle();
    if (error || !row) throw new Error("Tautan permintaan tidak valid atau sudah tidak tersedia.");
    return row;
  });

export const respondToRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => responseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("ml_has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!allowed) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: readError } = await supabaseAdmin
      .from("quote_requests")
      .select("id, email, contact_name, reference_no")
      .eq("id", data.id)
      .single();
    if (readError || !row) throw new Error("Permintaan tidak ditemukan.");
    const respondedAt = new Date().toISOString();
    const emailToken = data.sendEmail && row.email ? randomToken() : null;
    const { error } = await supabaseAdmin
      .from("quote_requests")
      .update({
        status: data.status,
        admin_response: data.response,
        response_valid_until: data.validUntil,
        responded_at: respondedAt,
        responded_by: context.userId,
        email_access_token_hash: emailToken ? await sha256(emailToken) : null,
      })
      .eq("id", data.id);
    if (error) throw new Error("Respons belum dapat disimpan.");

    let emailSent = false;
    if (data.sendEmail && row.email && emailToken) {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const origin = process.env["SITE_URL"] || "https://meatlink.id";
      const trackUrl = `${origin}/penawaran/${encodeURIComponent(row.reference_no)}?token=${encodeURIComponent(emailToken)}`;
      const result = await sendTemplateEmail("rfq-response", row.email, {
        idempotencyKey: `rfq-response-${row.id}-${respondedAt}`,
        templateData: {
          contactName: row.contact_name,
          referenceNo: row.reference_no,
          response: data.response,
          statusLabel: data.status === "quoted" ? "Penawaran tersedia" : "Status diperbarui",
          trackUrl,
          validUntil: data.validUntil,
        },
      });
      emailSent = result.sent;
    }
    return { ok: true, emailSent, hasEmail: Boolean(row.email), respondedAt };
  });
