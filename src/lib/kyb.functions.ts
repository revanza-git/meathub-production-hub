import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DocTypeEnum = z.enum(["NPWP", "NIB", "KTP_DIREKTUR", "REKENING_KORAN", "SIUP", "OTHER"]);

const RegisterSchema = z.object({
  organization_id: z.string().uuid(),
  doc_type: DocTypeEnum,
  storage_path: z.string().min(1).max(400),
  file_name: z.string().min(1).max(200),
  mime_type: z.string().max(120).optional(),
  size_bytes: z.number().int().nonnegative().max(20 * 1024 * 1024).optional(),
});

/** Register a KYB doc row after the client uploaded the file to storage. */
export const registerKybDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RegisterSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (!data.storage_path.startsWith(`${data.organization_id}/`)) {
      throw new Error("storage_path must live under <organization_id>/");
    }
    const { data: row, error } = await context.supabase
      .from("kyb_documents")
      .insert({
        organization_id: data.organization_id,
        doc_type: data.doc_type,
        storage_path: data.storage_path,
        file_name: data.file_name,
        mime_type: data.mime_type ?? null,
        size_bytes: data.size_bytes ?? null,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteKybDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error: readErr } = await context.supabase
      .from("kyb_documents")
      .select("storage_path, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!doc) throw new Error("Not found");
    if (doc.status !== "PENDING") throw new Error("Only pending documents can be deleted");
    const { error: delErr } = await context.supabase.from("kyb_documents").delete().eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    await context.supabase.storage.from("kyb").remove([doc.storage_path]);
    return { ok: true };
  });

const ReviewDocSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["ACCEPTED", "REJECTED"]),
  notes: z.string().max(500).optional(),
});

export const reviewKybDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewDocSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("kyb_documents")
      .update({
        status: data.status,
        review_notes: data.notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
