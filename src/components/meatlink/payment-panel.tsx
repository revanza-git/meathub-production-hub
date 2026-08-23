import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatIdr } from "@/lib/meatlink/inventory";
import { createOrderPayment, type PaymentInstruction } from "@/lib/meatlink/payment.functions";
import { useBi } from "@/lib/i18n";

const VA_BANKS: { value: string; label: string }[] = [
  { value: "bag", label: "Bank Artha Graha" },
  { value: "bca", label: "BCA" },
  { value: "bni", label: "BNI" },
  { value: "bri", label: "BRI" },
  { value: "mandiri", label: "Mandiri" },
  { value: "cimb", label: "CIMB Niaga" },
  { value: "permata", label: "Permata" },
];

type Props = {
  orderNo: string;
  token: string;
  method: "BANK_TRANSFER" | "QRIS";
  total: number;
  existing: {
    channel: string | null;
    va: string | null;
    qrUrl: string | null;
    expiresAt: string | null;
  };
  onPaid: () => void;
};

export function PaymentPanel({ orderNo, token, method, total, existing, onPaid }: Props) {
  const bi = useBi();
  const create = useServerFn(createOrderPayment);
  const [bank, setBank] = useState(existing.channel || "bag");
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState<PaymentInstruction | null>(
    existing.va || existing.qrUrl
      ? {
          channel: existing.channel ?? "",
          va: existing.va,
          qrUrl: existing.qrUrl,
          paymentUrl: null,
          expiresAt: existing.expiresAt,
          total,
        }
      : null,
  );

  // Poll for payment confirmation while an instruction is on screen.
  useEffect(() => {
    if (!info) return;
    const id = window.setInterval(onPaid, 15000);
    return () => window.clearInterval(id);
  }, [info, onPaid]);

  async function generate() {
    setPending(true);
    try {
      const result = await create({
        data: { orderNo, token, channel: method === "QRIS" ? "qris" : bank },
      });
      setInfo(result);
      onPaid();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : bi("Gagal membuat pembayaran.", "Failed to create payment."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 border border-crimson/40 bg-crimson/5 p-6">
      <h2 className="eyebrow text-crimson">
        {method === "QRIS" ? bi("Bayar dengan QRIS", "Pay with QRIS") : bi("Bayar dengan Virtual Account", "Pay with Virtual Account")}
      </h2>
      <p className="mt-3 text-sm text-ink/80">
        {bi("Total tagihan", "Total due")} <span className="font-medium text-ink">{formatIdr(total)}</span>.{" "}
        {bi(
          "Status pesanan diperbarui otomatis setelah pembayaran terverifikasi.",
          "The order status updates automatically once payment is verified.",
        )}
      </p>

      {method === "BANK_TRANSFER" ? (
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="text-xs text-ash">
            <span className="mb-1 block">{bi("Pilih bank", "Choose bank")}</span>
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="border border-line bg-background px-3 py-2 text-sm text-ink"
            >
              {VA_BANKS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="eyebrow inline-flex items-center gap-2 bg-crimson px-5 py-3 text-bone hover:bg-crimson-deep disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {info?.va ? bi("Ganti bank / perbarui", "Change bank / refresh") : bi("Buat nomor VA", "Generate VA number")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="eyebrow mt-5 inline-flex items-center gap-2 bg-crimson px-5 py-3 text-bone hover:bg-crimson-deep disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {info?.qrUrl ? bi("Perbarui kode QRIS", "Refresh QRIS code") : bi("Tampilkan kode QRIS", "Show QRIS code")}
        </button>
      )}

      {info?.va ? (
        <div className="mt-6 border border-line bg-background p-5">
          <p className="text-xs uppercase tracking-wide text-ash">
            {bi("Nomor Virtual Account", "Virtual Account number")} {info.channel ? `· ${info.channel.toUpperCase()}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <p className="font-display text-2xl text-ink">{info.va}</p>
            <button
              type="button"
              aria-label={bi("Salin nomor VA", "Copy VA number")}
              onClick={() => {
                void navigator.clipboard.writeText(info.va ?? "");
                toast.success(bi("Nomor VA disalin.", "VA number copied."));
              }}
              className="text-ash hover:text-crimson"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {info.expiresAt ? (
            <p className="mt-2 text-xs text-ash">
              {bi("Berlaku sampai", "Valid until")} {new Date(info.expiresAt).toLocaleString("id-ID")}
            </p>
          ) : null}
        </div>
      ) : null}

      {info?.qrUrl ? (
        <div className="mt-6 border border-line bg-background p-5">
          <img
            src={info.qrUrl}
            alt={bi(`Kode QRIS pembayaran pesanan ${orderNo}`, `QRIS payment code for order ${orderNo}`)}
            className="h-64 w-64 object-contain"
          />
          {info.expiresAt ? (
            <p className="mt-2 text-xs text-ash">
              {bi("Berlaku sampai", "Valid until")} {new Date(info.expiresAt).toLocaleString("id-ID")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
