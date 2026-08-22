import { createServerFn } from "@tanstack/react-start";

type UploadInput = {
  orderNo: string;
  token: string;
  fileName: string;
  contentType: string;
  /** base64-encoded file contents (no data: prefix) */
  data: string;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

/**
 * Uploads a buyer payment proof for a storefront order.
 *
 * The bucket is private and accepts no direct client writes: the caller must prove
 * ownership of the order with its tokenized tracking link, the file type/size is
 * validated server-side, and the object path is derived from the verified order.
 */
export const uploadPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((input: UploadInput) => {
    const orderNo = String(input?.orderNo ?? "").trim();
    const token = String(input?.token ?? "").trim();
    const contentType = String(input?.contentType ?? "").trim().toLowerCase();
    const data = String(input?.data ?? "");
    if (orderNo.length < 4 || token.length < 8) throw new Error("Tautan pesanan tidak valid.");
    if (!ALLOWED.has(contentType)) throw new Error("Format file harus JPG, PNG, WEBP, atau PDF.");
    if (!data) throw new Error("File kosong.");
    // base64 length -> byte size
    if (Math.floor((data.length * 3) / 4) > MAX_BYTES) throw new Error("Ukuran file maksimal 5 MB.");
    return {
      orderNo,
      token,
      contentType,
      data,
      fileName: String(input?.fileName ?? "bukti").slice(0, 120),
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("storefront_orders")
      .select("id, order_no")
      .eq("order_no", data.orderNo)
      .eq("access_token", data.token)
      .maybeSingle();

    if (error) throw new Error("Pesanan tidak dapat dibaca.");
    if (!order) throw new Error("Pesanan tidak ditemukan.");

    const bytes = Buffer.from(data.data, "base64");
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      throw new Error("Ukuran file tidak valid.");
    }

    const ext = EXT_BY_TYPE[data.contentType] ?? "bin";
    const path = `${order.order_no}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error("Gagal mengunggah bukti pembayaran.");

    const { error: rpcErr } = await supabaseAdmin.rpc("ml_attach_payment_proof", {
      _order_no: data.orderNo,
      _token: data.token,
      _url: path,
    });
    if (rpcErr) throw new Error("Bukti tersimpan namun gagal ditautkan ke pesanan.");

    return { ok: true as const };
  });
