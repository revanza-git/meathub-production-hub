import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

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
    toast.success("Terima kasih — pesanan ditandai selesai.");
    onConfirmed();
  }

  return (
    <div className="mt-8 border border-line p-6">
      <h2 className="eyebrow inline-flex items-center gap-2 text-ash">
        <Truck className="h-4 w-4" /> Pengiriman
      </h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {courier ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">Kurir</dt>
            <dd className="mt-1 text-ink">{courier}</dd>
          </div>
        ) : null}
        {trackingNo ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">No. resi</dt>
            <dd className="mt-1 font-mono text-ink">{trackingNo}</dd>
          </div>
        ) : null}
        {etaDate ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">Estimasi tiba</dt>
            <dd className="mt-1 text-ink">{formatDay(etaDate)}</dd>
          </div>
        ) : null}
        {shippedAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">Dikirim</dt>
            <dd className="mt-1 text-ink">{formatDay(shippedAt)}</dd>
          </div>
        ) : null}
        {deliveredAt ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ash">Diterima</dt>
            <dd className="mt-1 text-ink">{formatDay(deliveredAt)}</dd>
          </div>
        ) : null}
      </dl>

      {status === "SHIPPED" && !confirmedAt ? (
        <div className="mt-6 border-t border-line pt-6">
          <p className="text-sm text-ink/80">
            Sudah menerima pesanan Anda? Konfirmasi penerimaan agar pesanan ditutup.
          </p>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={saving}
            className="eyebrow mt-4 inline-flex items-center gap-2 bg-crimson px-6 py-3 text-bone hover:bg-crimson-deep disabled:opacity-60"
          >
            <PackageCheck className="h-4 w-4" />
            {saving ? "Menyimpan…" : "Konfirmasi pesanan diterima"}
          </button>
        </div>
      ) : null}

      {confirmedAt ? (
        <p className="mt-6 border-t border-line pt-6 text-sm text-ink/80">
          Penerimaan dikonfirmasi pada {formatDay(confirmedAt)}. Terima kasih telah berbelanja di
          Meatlink.
        </p>
      ) : null}
    </div>
  );
}
