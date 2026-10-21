import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBi } from "@/lib/i18n";

/** Lets a signed-in buyer cancel their own unpaid order; the database enforces every rule. */
export function CancelOrder({ orderNo, token, onCancelled }: { orderNo: string; token: string; onCancelled: () => void }) {
  const bi = useBi();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function submit() {
    setBusy(true);
    const { error } = await supabase.rpc("ml_buyer_cancel_store_order", { _order_no: orderNo, _token: token, _reason: reason.slice(0, 250) });
    setBusy(false);
    if (error) {
      toast.error(error.message || bi("Pesanan belum bisa dibatalkan.", "The order could not be cancelled."));
      return;
    }
    toast.success(bi("Pesanan dibatalkan.", "Order cancelled."));
    setOpen(false);
    onCancelled();
  }

  return (
    <div className="mt-6 border border-line bg-card p-5">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm text-ash underline underline-offset-4 hover:text-crimson">
          {bi("Batalkan pesanan ini", "Cancel this order")}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink">{bi("Yakin ingin membatalkan? Jangan batalkan jika Anda sudah mentransfer pembayaran.", "Cancel this order? Do not cancel if you have already transferred payment.")}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={250}
            rows={2}
            placeholder={bi("Alasan (opsional)", "Reason (optional)")}
            className="w-full border border-line bg-background p-2 text-sm"
          />
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={submit} className="eyebrow bg-crimson px-4 py-2 text-bone hover:bg-crimson-deep disabled:opacity-50">
              {busy ? bi("Membatalkan…", "Cancelling…") : bi("Ya, batalkan", "Yes, cancel")}
            </button>
            <button type="button" disabled={busy} onClick={() => setOpen(false)} className="eyebrow border border-line px-4 py-2 text-ink">
              {bi("Tidak jadi", "Keep order")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
