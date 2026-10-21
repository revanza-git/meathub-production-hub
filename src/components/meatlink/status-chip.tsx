import { ORDER_STATUS_LABEL_I18N, useLabel } from "@/lib/i18n";

/**
 * Shared order-status colour mapping — buyer and admin surfaces must stay in
 * sync, so the tones live here instead of per page. Muted, editorial palette:
 * ochre = attention, deep green = settled, steel blue = in motion, crimson = cancelled.
 */
export const STATUS_TONE: Record<string, string> = {
  NEW: "border-ink/25 bg-ink/5 text-ink",
  AWAITING_PAYMENT: "border-status-warn/50 bg-status-warn/10 text-status-warn",
  PAID: "border-status-ok/40 bg-status-ok/10 text-status-ok",
  PROCESSING: "border-status-info/40 bg-status-info/10 text-status-info",
  SHIPPED: "border-status-info/40 bg-status-info/10 text-status-info",
  COMPLETED: "border-status-ok/40 bg-status-ok/15 text-status-ok",
  CANCELLED: "border-crimson/40 bg-crimson/10 text-crimson",
};

export function StatusChip({
  status,
  label,
  className = "",
}: {
  status: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex border px-2 py-1 text-[11px] uppercase tracking-[0.12em] ${
        STATUS_TONE[status] ?? "border-line text-ash"
      } ${className}`}
    >
      {label}
    </span>
  );
}

/** Convenience wrapper that localises the label from the status code. */
export function LocalisedStatusChip({ status, className }: { status: string; className?: string }) {
  const label = useLabel();
  return <StatusChip status={status} label={label(ORDER_STATUS_LABEL_I18N, status)} className={className} />;
}
