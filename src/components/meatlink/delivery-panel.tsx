import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyOrderEventPublic } from "@/lib/meatlink/notify.functions";
import { useBi, useFormat } from "@/lib/i18n";

type Props = {
  orderNo: string;
  token: string;
  status: string;
  courier: string | null;
  trackingNo: string | null;
  etaDate: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  confirmedAt: string | null;
  onConfirmed: () => void;
};

export function DeliveryPanel({
  orderNo,
  token,
  status,
  courier,
  trackingNo,
  etaDate,
  shippedAt,
  deliveredAt,
  confirmedAt,
  onConfirmed,
}: Props) {
  const bi = useBi();
  const fmt = useFormat();
  const fmtDay = fmt.longDate;
  const [saving, setSaving] = useState(false);
  const hasInfo = Boolean(courier || trackingNo || etaDate || shippedAt || deliveredAt);
  if (!hasInfo && status !== "SHIPPED") return null;

  async function confirm() {
    setSaving(true);
    const { error } = await supabase.rpc("ml_confirm_store_receipt", {
      _order_no: orderNo,
      _token: token,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void notifyOrderEventPublic({
      data: { orderNo, token, event: "completed" },
    }).catch(() => undefined);
    toast.success(bi("Terima kasih — pesanan ditandai selesai.", "Thank you — the order has been marked completed."));
    onConfirmed();
  }

  return (
    <div className="mt-8 border border-line p-6">
      <h2 className="eyebrow inline-flex items-center gap-2 text-ash">
        <Truck className="h-4 w-4" /> {bi("Pengiriman", "Delivery")}
      </h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {courier ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">{bi("Kurir", "Courier")}</dt>
            <dd className="mt-1 text-ink">{courier}</dd>
          </div>
        ) : null}
        {trackingNo ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">{bi("No. resi", "Tracking no.")}</dt>
            <dd className="mt-1 font-mono text-ink">{trackingNo}</dd>
          </div>
        ) : null}
        {etaDate ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">{bi("Estimasi tiba", "Estimated arrival")}</dt>
            <dd className="mt-1 text-ink">{fmtDay(etaDate)}</dd>
          </div>
        ) : null}
        {shippedAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">{bi("Dikirim", "Shipped")}</dt>
            <dd className="mt-1 text-ink">{fmtDay(shippedAt)}</dd>
          </div>
        ) : null}
        {deliveredAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">{bi("Diterima", "Received")}</dt>
            <dd className="mt-1 text-ink">{fmtDay(deliveredAt)}</dd>
          </div>
        ) : null}
      </dl>

      {status === "SHIPPED" && !confirmedAt ? (
        <div className="mt-6 border-t border-line pt-6">
          <p className="text-sm text-ink/80">
            {bi(
              "Sudah menerima pesanan Anda? Konfirmasi penerimaan agar pesanan ditutup.",
              "Have you received your order? Confirm receipt to close it out.",
            )}
          </p>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={saving}
            className="eyebrow mt-4 inline-flex items-center gap-2 bg-crimson px-6 py-3 text-bone hover:bg-crimson-deep disabled:opacity-60"
          >
            <PackageCheck className="h-4 w-4" />
            {saving ? bi("Menyimpan…", "Saving…") : bi("Konfirmasi pesanan diterima", "Confirm order received")}
          </button>
        </div>
      ) : null}

      {confirmedAt ? (
        <p className="mt-6 border-t border-line pt-6 text-sm text-ink/80">
          {bi(
            `Penerimaan dikonfirmasi pada ${fmtDay(confirmedAt)}. Terima kasih telah berbelanja di Meatlink.`,
            `Receipt confirmed on ${fmtDay(confirmedAt)}. Thank you for shopping with Meatlink.`,
          )}
        </p>
      ) : null}
    </div>
  );
}
