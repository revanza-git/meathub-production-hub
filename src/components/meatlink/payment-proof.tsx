import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { uploadPaymentProof } from "@/lib/meatlink/payment-proof.functions";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

/** Buyer-side upload of a transfer receipt / payment proof for an order.
 *  The file is validated and stored server-side in the private payment-proofs
 *  bucket after the order token is verified; only admins can read it. */
export function PaymentProofUpload({
  orderNo,
  token,
}: {
  orderNo: string;
  token: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const upload = useServerFn(uploadPaymentProof);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB.");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error("Format file harus JPG, PNG, WEBP, atau PDF.");
      return;
    }
    setBusy(true);
    try {
      const base64 = await toBase64(file);
      await upload({
        data: {
          orderNo,
          token,
          fileName: file.name,
          contentType: file.type,
          data: base64,
        },
      });
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
