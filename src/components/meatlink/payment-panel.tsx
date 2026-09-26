import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { createOrderPayment, checkOrderPayment, type PaymentInstruction } from "@/lib/meatlink/payment.functions";
import { Button } from "@/components/ui/button";
import { useBi, useFormat } from "@/lib/i18n";

const VA_BANKS: { value: string; label: string }[] = [
  { value: "bca", label: "BCA" },
  { value: "bni", label: "BNI" },
  { value: "bri", label: "BRI" },
  { value: "mandiri", label: "Mandiri" },
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
  const fmt = useFormat();
  const create = useServerFn(createOrderPayment);
  const check = useServerFn(checkOrderPayment);
  const [bank, setBank] = useState(existing.channel && existing.channel !== "qris" ? existing.channel : "bca");
  const [pending, setPending] = useState(false);
  const expired = Boolean(existing.expiresAt && new Date(existing.expiresAt).getTime() <= Date.now());
  const [info, setInfo] = useState<PaymentInstruction | null>(
    !expired && (existing.va || existing.qrUrl)
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
    if (!info && !expired) return;
    const id = window.setInterval(() => {
      void check({ data: { orderNo, token } }).then((result) => {
        if (result.paid || result.closed) onPaid();
      }).catch(() => {});
    }, 15000);
    return () => window.clearInterval(id);
  }, [info, expired, onPaid, orderNo, token, check]);

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
        {bi("Total tagihan", "Total due")} <span className="font-medium text-ink">{fmt.money(total)}</span>.{" "}
        {bi(
          "Status pesanan diperbarui otomatis setelah pembayaran terverifikasi.",
          "The order status updates automatically once payment is verified.",
        )}
      </p>

      {expired ? <p className="mt-4 text-sm text-crimson">{bi("Instruksi pembayaran telah berakhir. Status transaksi sedang diverifikasi; hubungi tim kami bila Anda sudah membayar.", "Payment instructions have expired. The transaction is being verified; contact our team if you have already paid.")}</p> : null}

      {expired ? null : method === "BANK_TRANSFER" ? (
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
           <Button
            type="button"
            onClick={generate}
            disabled={pending}
             className="eyebrow h-auto rounded-none bg-crimson px-5 py-3 text-bone hover:bg-crimson-deep disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {info?.va ? bi("Ganti bank / perbarui", "Change bank / refresh") : bi("Buat nomor VA", "Generate VA number")}
           </Button>
        </div>
      ) : (
         <Button
          type="button"
          onClick={generate}
          disabled={pending}
           className="eyebrow mt-5 h-auto rounded-none bg-crimson px-5 py-3 text-bone hover:bg-crimson-deep disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {info?.qrUrl ? bi("Perbarui kode QRIS", "Refresh QRIS code") : bi("Tampilkan kode QRIS", "Show QRIS code")}
         </Button>
      )}

      {info?.va ? (
        <div className="mt-6 border border-line bg-background p-5">
          <p className="text-xs uppercase tracking-wide text-ash">
            {bi("Nomor Virtual Account", "Virtual Account number")} {info.channel ? `· ${info.channel.toUpperCase()}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <p className="font-display text-2xl text-ink">{info.va}</p>
             <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={bi("Salin nomor VA", "Copy VA number")}
              onClick={() => {
                void navigator.clipboard.writeText(info.va ?? "");
                toast.success(bi("Nomor VA disalin.", "VA number copied."));
              }}
              className="text-ash hover:text-crimson"
            >
              <Copy className="h-4 w-4" />
             </Button>
          </div>
          {info.expiresAt ? (
            <p className="mt-2 text-xs text-ash">
              {bi("Berlaku sampai", "Valid until")} {fmt.dateTime(info.expiresAt)}
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
              {bi("Berlaku sampai", "Valid until")} {fmt.dateTime(info.expiresAt)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
