import { useBi, useLabel, useFormat, ORDER_STATUS_LABEL_I18N } from "@/lib/i18n";

export type TimelineEvent = {
  to_status: string;
  from_status?: string | null;
  note?: string | null;
  created_at: string;
};

export function OrderTimeline({ events }: { events: TimelineEvent[] }) {
  const bi = useBi();
  const label = useLabel();
  const fmt = useFormat();
  if (!events.length) return null;
  return (
    <div className="mt-8 border border-line p-6">
      <h2 className="eyebrow text-ash">{bi("Riwayat pesanan", "Order history")}</h2>
      <ol className="mt-4 space-y-4">
        {events.map((e, idx) => {
          const last = idx === events.length - 1;
          return (
            <li key={`${e.created_at}-${idx}`} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${last ? "bg-crimson" : "bg-ink/25"}`}
                />
                {idx < events.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
              </div>
              <div className="pb-1">
                <p className="text-sm text-ink">
                  {label(ORDER_STATUS_LABEL_I18N, e.to_status)}
                </p>
                <p className="mt-1 text-xs text-ash">{fmt.dateTime(e.created_at)}</p>
                {e.note ? <p className="mt-1 text-xs italic text-ash">{e.note}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
