import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Buyer-side upload of a transfer receipt / payment proof for an order.
 *  The file lands in the private payment-proofs bucket; only admins can read it. */
export function PaymentProofUpload({
  orderNo,
  token,
}: {
  orderNo: string;
  token: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${orderNo}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.rpc("ml_attach_payment_proof", {
        _order_no: orderNo,
        _token: token,
        _url: path,
      });
      if (error) throw error;
      setDone(true);
      toast.success("Bukti pembayaran terkirim. Tim kami memverifikasi segera.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah bukti pembayaran.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border border-line p-6">
      <h2 className="eyebrow text-ash">Unggah bukti pembayaran</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        Sudah transfer atau bayar tunai? Unggah foto struk / bukti transfer agar tim kami dapat
        memverifikasi lebih cepat. Format JPG, PNG, atau PDF (maks. 5 MB).
      </p>
      {done ? (
        <p className="mt-4 text-sm text-crimson">Bukti pembayaran sudah kami terima.</p>
      ) : (
        <label className="eyebrow mt-5 inline-flex cursor-pointer items-center border border-ink px-6 py-3 text-ink transition-colors hover:bg-ink hover:text-bone">
          {busy ? "Mengunggah…" : "Pilih file"}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}
