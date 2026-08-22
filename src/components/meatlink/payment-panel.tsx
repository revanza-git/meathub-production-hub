import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatIdr } from "@/lib/meatlink/inventory";
import { createOrderPayment, type PaymentInstruction } from "@/lib/meatlink/payment.functions";

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
      toast.error(err instanceof Error ? err.message : "Gagal membuat pembayaran.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-8 border border-crimson/40 bg-crimson/5 p-6">
      <h2 className="eyebrow text-crimson">
        {method === "QRIS" ? "Bayar dengan QRIS" : "Bayar dengan Virtual Account"}
      </h2>
      <p className="mt-3 text-sm text-ink/80">
        Total tagihan <span className="font-medium text-ink">{formatIdr(total)}</span>. Status
        pesanan diperbarui otomatis setelah pembayaran terverifikasi.
      </p>

      {method === "BANK_TRANSFER" ? (
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="text-xs text-ash">
            <span className="mb-1 block">Pilih bank</span>
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
            {info?.va ? "Ganti bank / perbarui" : "Buat nomor VA"}
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
          {info?.qrUrl ? "Perbarui kode QRIS" : "Tampilkan kode QRIS"}
        </button>
      )}

      {info?.va ? (
        <div className="mt-6 border border-line bg-background p-5">
          <p className="text-xs uppercase tracking-wide text-ash">
            Nomor Virtual Account {info.channel ? `· ${info.channel.toUpperCase()}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <p className="font-display text-2xl text-ink">{info.va}</p>
            <button
              type="button"
              aria-label="Salin nomor VA"
              onClick={() => {
                void navigator.clipboard.writeText(info.va ?? "");
                toast.success("Nomor VA disalin.");
              }}
              className="text-ash hover:text-crimson"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {info.expiresAt ? (
            <p className="mt-2 text-xs text-ash">
              Berlaku sampai {new Date(info.expiresAt).toLocaleString("id-ID")}
            </p>
          ) : null}
        </div>
      ) : null}

      {info?.qrUrl ? (
        <div className="mt-6 border border-line bg-background p-5">
          <img
            src={info.qrUrl}
            alt={`Kode QRIS pembayaran pesanan ${orderNo}`}
            className="h-64 w-64 object-contain"
          />
          {info.expiresAt ? (
            <p className="mt-2 text-xs text-ash">
              Berlaku sampai {new Date(info.expiresAt).toLocaleString("id-ID")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
