import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { uploadPaymentProof } from "@/lib/meatlink/payment-proof.functions";
import { useBi } from "@/lib/i18n";

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
  const bi = useBi();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const upload = useServerFn(uploadPaymentProof);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(bi("Ukuran file maksimal 5 MB.", "Maximum file size is 5 MB."));
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error(bi("Format file harus JPG, PNG, WEBP, atau PDF.", "File must be JPG, PNG, WEBP, or PDF."));
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
      toast.success(bi("Bukti pembayaran terkirim. Tim kami memverifikasi segera.", "Payment proof submitted. Our team will verify it shortly."));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : bi("Gagal mengunggah bukti pembayaran.", "Failed to upload payment proof."));
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="mt-8 border border-line p-6">
      <h2 className="eyebrow text-ash">{bi("Unggah bukti pembayaran", "Upload payment proof")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        {bi(
          "Sudah transfer atau bayar tunai? Unggah foto struk / bukti transfer agar tim kami dapat memverifikasi lebih cepat. Format JPG, PNG, atau PDF (maks. 5 MB).",
          "Already transferred or paid in cash? Upload a photo of the receipt / transfer proof so our team can verify it faster. JPG, PNG, or PDF format (max. 5 MB).",
        )}
      </p>
      {done ? (
        <p className="mt-4 text-sm text-crimson">{bi("Bukti pembayaran sudah kami terima.", "We have received your payment proof.")}</p>
      ) : (
        <label className="eyebrow mt-5 inline-flex cursor-pointer items-center border border-ink px-6 py-3 text-ink transition-colors hover:bg-ink hover:text-bone">
          {busy ? bi("Mengunggah…", "Uploading…") : bi("Pilih file", "Choose file")}
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
