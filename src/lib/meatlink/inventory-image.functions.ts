import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type UploadInput = {
  itemId: string;
  contentType: string;
  /** base64-encoded file contents (no data: prefix) */
  data: string;
};

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "inventory-photos";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Uploads a product photo for an admin_inventory row.
 *
 * The bucket is public (read), but uploads are restricted to platform admins
 * via ml_has_role. The stored image_url is the bucket's public URL, which
 * resolveFeatureImage / resolveProductImage pass through as-is.
 */
export const uploadInventoryImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UploadInput) => {
    const itemId = String(input?.itemId ?? "").trim();
    const contentType = String(input?.contentType ?? "").trim().toLowerCase();
    const data = String(input?.data ?? "");
    if (itemId.length < 8) throw new Error("Item tidak valid.");
    if (!ALLOWED.has(contentType)) throw new Error("Format gambar harus JPG, PNG, atau WEBP.");
    if (!data) throw new Error("File kosong.");
    if (Math.floor((data.length * 3) / 4) > MAX_BYTES) {
      throw new Error("Ukuran gambar maksimal 5 MB.");
    }
    return { itemId, contentType, data };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("ml_has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: item, error: itemErr } = await supabaseAdmin
      .from("admin_inventory")
      .select("id")
      .eq("id", data.itemId)
      .maybeSingle();
    if (itemErr || !item) throw new Error("Item inventaris tidak ditemukan.");

    const bytes = Buffer.from(data.data, "base64");
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      throw new Error("Ukuran gambar tidak valid.");
    }

    const ext = EXT_BY_TYPE[data.contentType] ?? "jpg";
    const rand = crypto.randomUUID().slice(0, 8);
    const path = `items/${item.id}/${Date.now()}-${rand}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error("Gagal mengunggah gambar.");

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;

    const { error: linkErr } = await supabaseAdmin
      .from("admin_inventory")
      .update({ image_url: url })
      .eq("id", item.id);
    if (linkErr) throw new Error("Gambar tersimpan namun gagal ditautkan ke item.");

    return { ok: true as const, url };
  });
